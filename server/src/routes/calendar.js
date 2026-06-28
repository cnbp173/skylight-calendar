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

      res.json(calendars);
    } catch (error) {
      console.error('Calendar list error:', error.message);
      res.status(500).json({ error: 'Failed to fetch calendars' });
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

      const events = allEvents.flat().sort((a, b) =>
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
