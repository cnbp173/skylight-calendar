/**
 * Calendar Routes Module
 *
 * Provides endpoints for reading and updating Google Calendar data.
 * This is the core of the Skylight Calendar backend — it fetches events
 * from all connected calendars and, when the user reschedules an event
 * via drag-and-drop or the edit dialog, pushes updates back to Google.
 *
 * Endpoints:
 *   GET  /api/calendar/list          - List all calendars the user has access to
 *   GET  /api/calendar/events        - Fetch events for a given time range
 *   PATCH /api/calendar/events/:id   - Update an event (reschedule, rename, etc.)
 *
 * Caching:
 *   Events are cached for 5 minutes to reduce API calls. The cache is
 *   invalidated when an event is updated via PATCH so the UI immediately
 *   reflects the change without waiting for the next fetch cycle.
 */

import { Router } from 'express';
import { google } from 'googleapis';
import NodeCache from 'node-cache';
import { getAuthenticatedClient } from './auth.js';

/**
 * In-memory cache with a 5-minute TTL. Reduces Google Calendar API calls
 * since the Pi continuously refreshes the display. Keys are composite
 * strings like "events:cal1,cal2:timeMin:timeMax".
 */
const cache = new NodeCache({ stdTTL: 300 });

/**
 * Predefined color palette for calendars that don't have a custom
 * backgroundColor set in Google. Colors are cycled by index.
 */
const CALENDAR_COLORS = [
  '#E57373', // red
  '#64B5F6', // blue
  '#81C784', // green
  '#FFB74D', // orange
  '#BA68C8', // purple
  '#4DB6AC', // teal
  '#F06292', // pink
  '#A1887F', // brown
];

/**
 * Demo calendars displayed when in demo mode (no real Google connection).
 * These let users preview the calendar's appearance without OAuth setup.
 */
const DEMO_CALENDARS = [
  { id: 'demo-sarah', summary: 'Sarah', color: '#F06292', primary: false },
  { id: 'demo-kids', summary: 'Kids', color: '#FFB74D', primary: false },
];

/**
 * Generates fake events for the demo calendars within the specified time window.
 * Events are deterministically placed based on day-of-week offsets from the
 * start of the requested range, making the demo predictable and consistent.
 *
 * @param {string} timeMin - ISO string for the start of the range
 * @param {string} timeMax - ISO string for the end of the range
 * @returns {Array} Array of event objects matching the standard event shape
 */
function generateDemoEvents(timeMin, timeMax) {
  const start = new Date(timeMin);
  const events = [];

  // Sarah's weekly schedule — a mix of fitness, social, and errands
  const sarahEvents = [
    { day: 1, hour: 9, duration: 1, title: 'Yoga Class' },
    { day: 1, hour: 12, duration: 1, title: 'Lunch with Amy' },
    { day: 2, hour: 10, duration: 1.5, title: 'Book Club' },
    { day: 3, hour: 8, duration: 0.75, title: 'Morning Run' },
    { day: 3, hour: 14, duration: 1, title: 'Dentist Appointment', location: '45 Oak St' },
    { day: 4, hour: 11, duration: 1, title: 'Coffee with Mom' },
    { day: 5, hour: 9, duration: 1, title: 'Yoga Class' },
    { day: 5, hour: 15, duration: 2, title: 'Volunteering' },
    { day: 6, hour: 10, duration: 1.5, title: 'Farmers Market' },
  ];

  // Kids' activity schedule — after-school sports and lessons
  const kidsEvents = [
    { day: 1, hour: 15.5, duration: 1, title: 'Soccer Practice', location: 'Lincoln Park' },
    { day: 2, hour: 16, duration: 1, title: 'Piano Lesson' },
    { day: 3, hour: 15.5, duration: 1, title: 'Soccer Practice', location: 'Lincoln Park' },
    { day: 4, hour: 16, duration: 1.5, title: 'Swimming', location: 'YMCA Pool' },
    { day: 5, hour: 15, duration: 1, title: 'Art Class' },
    { day: 6, hour: 9, duration: 2, title: 'Soccer Game', location: 'Riverside Field' },
    { day: 0, hour: 10, duration: 1, title: 'Playdate at Millers' },
  ];

  // Convert each template event into a full event object with computed timestamps
  sarahEvents.forEach((e, i) => {
    const eventStart = new Date(start);
    eventStart.setDate(eventStart.getDate() + e.day);
    eventStart.setHours(Math.floor(e.hour), (e.hour % 1) * 60, 0, 0);
    const eventEnd = new Date(eventStart);
    eventEnd.setMinutes(eventEnd.getMinutes() + e.duration * 60);

    // Only include events that fall within the requested time window
    if (eventStart >= new Date(timeMin) && eventStart < new Date(timeMax)) {
      events.push({
        id: `demo-sarah-${i}`,
        calendarId: 'demo-sarah',
        title: e.title,
        start: eventStart.toISOString(),
        end: eventEnd.toISOString(),
        allDay: false,
        location: e.location || null,
        description: null,
      });
    }
  });

  kidsEvents.forEach((e, i) => {
    const eventStart = new Date(start);
    eventStart.setDate(eventStart.getDate() + e.day);
    eventStart.setHours(Math.floor(e.hour), (e.hour % 1) * 60, 0, 0);
    const eventEnd = new Date(eventStart);
    eventEnd.setMinutes(eventEnd.getMinutes() + e.duration * 60);

    if (eventStart >= new Date(timeMin) && eventStart < new Date(timeMax)) {
      events.push({
        id: `demo-kids-${i}`,
        calendarId: 'demo-kids',
        title: e.title,
        start: eventStart.toISOString(),
        end: eventEnd.toISOString(),
        allDay: false,
        location: e.location || null,
        description: null,
      });
    }
  });

  return events;
}

/**
 * Creates and returns the Express router for all calendar endpoints.
 * The router is mounted at /api/calendar in the main app.
 *
 * @returns {Router} Express router with calendar routes
 */
export function createCalendarRouter() {
  const router = Router();

  /**
   * GET /api/calendar/list
   *
   * Fetches all calendars visible to the authenticated user from Google,
   * enriches each with a color, and appends demo calendars for preview purposes.
   *
   * Response: Array of { id, summary, color, primary } objects
   */
  router.get('/list', async (req, res) => {
    try {
      const auth = getAuthenticatedClient();
      if (!auth) return res.status(401).json({ error: 'Not authenticated' });

      const calendar = google.calendar({ version: 'v3', auth });
      const { data } = await calendar.calendarList.list();

      // Map each Google calendar to our simplified format, using the Google-
      // assigned background color or falling back to our predefined palette
      const calendars = (data.items || []).map((cal, i) => ({
        id: cal.id,
        summary: cal.summary,
        color: cal.backgroundColor || CALENDAR_COLORS[i % CALENDAR_COLORS.length],
        primary: cal.primary || false,
      }));

      // Append demo calendars so the UI always has something to show
      calendars.push(...DEMO_CALENDARS);

      res.json(calendars);
    } catch (error) {
      console.error('Calendar list error:', error.message, error.response?.data || '');
      res.status(500).json({ error: 'Failed to fetch calendars', detail: error.message });
    }
  });

  /**
   * GET /api/calendar/events
   *
   * Fetches events from all specified calendars within a time range.
   * Results are cached for 5 minutes to minimize API load on the Pi.
   *
   * Query params:
   *   - calendars: comma-separated calendar IDs (defaults to 'primary')
   *   - timeMin: ISO date string for range start
   *   - timeMax: ISO date string for range end
   *
   * Response: Sorted array of event objects
   */
  router.get('/events', async (req, res) => {
    try {
      const auth = getAuthenticatedClient();
      if (!auth) return res.status(401).json({ error: 'Not authenticated' });

      const { calendars, timeMin, timeMax } = req.query;

      // Check the cache before hitting Google's API
      const cacheKey = `events:${calendars}:${timeMin}:${timeMax}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const calendarIds = calendars ? calendars.split(',') : ['primary'];
      const calendarApi = google.calendar({ version: 'v3', auth });

      // Default to the current week if no time range is specified
      const now = new Date();
      const weekStart = timeMin || startOfWeek(now).toISOString();
      const weekEnd = timeMax || endOfWeek(now).toISOString();

      // Fetch events from each calendar in parallel for speed.
      // Individual calendar failures are caught and return empty arrays
      // so one bad calendar doesn't break the whole display.
      const allEvents = await Promise.all(
        calendarIds.map(async (calendarId) => {
          try {
            const { data } = await calendarApi.events.list({
              calendarId,
              timeMin: weekStart,
              timeMax: weekEnd,
              singleEvents: true,
              orderBy: 'startTime',
              maxResults: 250,
            });

            // Normalize each Google event into our standard shape
            return (data.items || []).map((event) => ({
              id: event.id,
              calendarId,
              title: event.summary || '(No title)',
              start: event.start.dateTime || event.start.date,
              end: event.end.dateTime || event.end.date,
              allDay: !event.start.dateTime,
              location: event.location || null,
              description: event.description || null,
            }));
          } catch (e) {
            console.error(`Error fetching calendar ${calendarId}:`, e.message);
            return [];
          }
        })
      );

      // Add demo events and sort everything chronologically
      const demoEvents = generateDemoEvents(weekStart, weekEnd);
      const events = [...allEvents.flat(), ...demoEvents].sort((a, b) =>
        new Date(a.start) - new Date(b.start)
      );

      cache.set(cacheKey, events);
      res.json(events);
    } catch (error) {
      console.error('Events error:', error.message);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  /**
   * POST /api/calendar/events
   *
   * Creates a new event on Google Calendar. Called when the user clicks
   * "Add New Appointment" and submits the form.
   *
   * Body (JSON):
   *   - calendarId: (required) Which calendar to create the event on
   *   - title: (required) Event title/summary
   *   - start: (required) Start time as ISO string
   *   - end: (required) End time as ISO string
   *   - description: (optional) Event description
   *
   * On success:
   *   - Creates the event on Google Calendar
   *   - Flushes all cached events so the next fetch includes the new event
   *   - Returns the created event in our standard format
   */
  router.post('/events', async (req, res) => {
    try {
      const auth = getAuthenticatedClient();
      if (!auth) return res.status(401).json({ error: 'Not authenticated' });

      const { calendarId, title, start, end, description } = req.body;

      // Validate required fields
      if (!calendarId) {
        return res.status(400).json({ error: 'calendarId is required' });
      }
      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }
      if (!start || !end) {
        return res.status(400).json({ error: 'start and end are required' });
      }

      // Build the event resource for Google Calendar API
      const eventResource = {
        summary: title,
        start: { dateTime: start },
        end: { dateTime: end },
      };
      if (description) {
        eventResource.description = description;
      }

      // Call the Google Calendar API to insert the event
      const calendarApi = google.calendar({ version: 'v3', auth });
      const { data } = await calendarApi.events.insert({
        calendarId,
        requestBody: eventResource,
      });

      // Flush the event cache so the next GET /events includes the new event
      cache.flushAll();

      // Return the created event in our standard format
      res.status(201).json({
        id: data.id,
        calendarId,
        title: data.summary || '(No title)',
        start: data.start.dateTime || data.start.date,
        end: data.end.dateTime || data.end.date,
        allDay: !data.start.dateTime,
        location: data.location || null,
        description: data.description || null,
      });
    } catch (error) {
      console.error('Event create error:', error.message, error.response?.data || '');
      res.status(500).json({ error: 'Failed to create event', detail: error.message });
    }
  });

  /**
   * PATCH /api/calendar/events/:id
   *
   * Updates an existing event on Google Calendar. Called when the user
   * drags an event to a new time slot (within the current week) or uses
   * the edit dialog to change the title, time, date, or description.
   *
   * URL params:
   *   - id: The Google Calendar event ID
   *
   * Body (JSON):
   *   - calendarId: (required) Which calendar the event belongs to
   *   - title: (optional) New event title/summary
   *   - start: (optional) New start time as ISO string
   *   - end: (optional) New end time as ISO string
   *   - description: (optional) New event description
   *
   * On success:
   *   - Pushes the update to Google Calendar
   *   - Flushes all cached events so the next fetch reflects the change
   *   - Returns the updated event in our standard format
   *
   * Demo events (IDs starting with "demo-") are handled locally since
   * they don't exist in Google. The response simulates success.
   */
  router.patch('/events/:id', async (req, res) => {
    try {
      const auth = getAuthenticatedClient();
      if (!auth) return res.status(401).json({ error: 'Not authenticated' });

      const { id } = req.params;
      const { calendarId, title, start, end, description } = req.body;

      // Validate that a calendarId was provided — we need it to know which
      // Google Calendar to target for the update
      if (!calendarId) {
        return res.status(400).json({ error: 'calendarId is required' });
      }

      // Demo events are not real Google Calendar events, so we simulate
      // a successful update without hitting the API
      if (id.startsWith('demo-')) {
        return res.json({
          id,
          calendarId,
          title: title || '(No title)',
          start: start || null,
          end: end || null,
          allDay: false,
          location: null,
          description: description || null,
        });
      }

      // Build the patch object — only include fields that were provided
      // so we don't accidentally null out fields the user didn't intend to change
      const patch = {};
      if (title !== undefined) patch.summary = title;
      if (description !== undefined) patch.description = description;
      if (start !== undefined) patch.start = { dateTime: start };
      if (end !== undefined) patch.end = { dateTime: end };

      // Call the Google Calendar API to apply the update
      const calendarApi = google.calendar({ version: 'v3', auth });
      const { data } = await calendarApi.events.patch({
        calendarId,
        eventId: id,
        requestBody: patch,
      });

      // Flush the entire event cache so the next GET /events returns fresh data.
      // This is simpler than surgically updating individual cache entries and
      // the cost (one extra API call on next fetch) is negligible.
      cache.flushAll();

      // Return the updated event in our standard format
      res.json({
        id: data.id,
        calendarId,
        title: data.summary || '(No title)',
        start: data.start.dateTime || data.start.date,
        end: data.end.dateTime || data.end.date,
        allDay: !data.start.dateTime,
        location: data.location || null,
        description: data.description || null,
      });
    } catch (error) {
      console.error('Event update error:', error.message, error.response?.data || '');
      res.status(500).json({ error: 'Failed to update event', detail: error.message });
    }
  });

  return router;
}

/**
 * Returns midnight on Sunday of the week containing the given date.
 * Used as the default start of the event fetch window.
 *
 * @param {Date} date - Any date within the target week
 * @returns {Date} Midnight on the Sunday of that week
 */
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns midnight on the Sunday AFTER the week containing the given date.
 * Used as the default end of the event fetch window (exclusive).
 *
 * @param {Date} date - Any date within the target week
 * @returns {Date} Midnight on the following Sunday
 */
function endOfWeek(date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 7);
  return d;
}
