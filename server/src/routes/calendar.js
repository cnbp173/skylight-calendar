import { Router } from 'express';
import { google } from 'googleapis';
import NodeCache from 'node-cache';
import { getAuthenticatedClient } from './auth.js';

const cache = new NodeCache({ stdTTL: 300 }); // 5 min cache

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

const DEMO_CALENDARS = [
  { id: 'demo-sarah', summary: 'Sarah', color: '#F06292', primary: false },
  { id: 'demo-kids', summary: 'Kids', color: '#FFB74D', primary: false },
];

function generateDemoEvents(timeMin, timeMax) {
  const start = new Date(timeMin);
  const events = [];

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

  const kidsEvents = [
    { day: 1, hour: 15.5, duration: 1, title: 'Soccer Practice', location: 'Lincoln Park' },
    { day: 2, hour: 16, duration: 1, title: 'Piano Lesson' },
    { day: 3, hour: 15.5, duration: 1, title: 'Soccer Practice', location: 'Lincoln Park' },
    { day: 4, hour: 16, duration: 1.5, title: 'Swimming', location: 'YMCA Pool' },
    { day: 5, hour: 15, duration: 1, title: 'Art Class' },
    { day: 6, hour: 9, duration: 2, title: 'Soccer Game', location: 'Riverside Field' },
    { day: 0, hour: 10, duration: 1, title: 'Playdate at Millers' },
  ];

  sarahEvents.forEach((e, i) => {
    const eventStart = new Date(start);
    eventStart.setDate(eventStart.getDate() + e.day);
    eventStart.setHours(Math.floor(e.hour), (e.hour % 1) * 60, 0, 0);
    const eventEnd = new Date(eventStart);
    eventEnd.setMinutes(eventEnd.getMinutes() + e.duration * 60);

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

export function createCalendarRouter() {
  const router = Router();

  router.get('/list', async (req, res) => {
    try {
      const auth = getAuthenticatedClient();
      if (!auth) return res.status(401).json({ error: 'Not authenticated' });

      const calendar = google.calendar({ version: 'v3', auth });
      const { data } = await calendar.calendarList.list();

      const calendars = (data.items || []).map((cal, i) => ({
        id: cal.id,
        summary: cal.summary,
        color: cal.backgroundColor || CALENDAR_COLORS[i % CALENDAR_COLORS.length],
        primary: cal.primary || false,
      }));

      calendars.push(...DEMO_CALENDARS);

      res.json(calendars);
    } catch (error) {
      console.error('Calendar list error:', error.message, error.response?.data || '');
      res.status(500).json({ error: 'Failed to fetch calendars', detail: error.message });
    }
  });

  router.get('/events', async (req, res) => {
    try {
      const auth = getAuthenticatedClient();
      if (!auth) return res.status(401).json({ error: 'Not authenticated' });

      const { calendars, timeMin, timeMax } = req.query;

      const cacheKey = `events:${calendars}:${timeMin}:${timeMax}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const calendarIds = calendars ? calendars.split(',') : ['primary'];
      const calendarApi = google.calendar({ version: 'v3', auth });

      const now = new Date();
      const weekStart = timeMin || startOfWeek(now).toISOString();
      const weekEnd = timeMax || endOfWeek(now).toISOString();

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

  return router;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 7);
  return d;
}
