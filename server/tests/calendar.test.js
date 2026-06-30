/**
 * Calendar Routes — Unit Tests
 *
 * Tests the three calendar endpoints:
 *   GET  /api/calendar/list       - List connected calendars
 *   GET  /api/calendar/events     - Fetch events for a time range
 *   PATCH /api/calendar/events/:id - Update an event (reschedule/rename)
 *
 * Uses vitest for test runner and supertest for HTTP assertions.
 * Google APIs and auth are mocked to test route logic in isolation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createCalendarRouter } from '../src/routes/calendar.js';

// Mock the node-cache module — we don't want caching during tests
vi.mock('node-cache', () => {
  return {
    default: class {
      get() { return undefined; }
      set() {}
      flushAll() {}
    },
  };
});

// Mock the auth module so we can control authentication state per test
vi.mock('../src/routes/auth.js', () => ({
  getAuthenticatedClient: vi.fn(),
}));

// Mock the googleapis module to intercept Google Calendar API calls
vi.mock('googleapis', () => {
  const mockList = vi.fn();
  const mockEventsList = vi.fn();
  const mockEventsPatch = vi.fn();
  return {
    google: {
      calendar: () => ({
        calendarList: { list: mockList },
        events: { list: mockEventsList, patch: mockEventsPatch },
      }),
    },
    __mockCalendarListList: mockList,
    __mockEventsList: mockEventsList,
    __mockEventsPatch: mockEventsPatch,
  };
});

import { getAuthenticatedClient } from '../src/routes/auth.js';
import { __mockCalendarListList, __mockEventsList, __mockEventsPatch } from 'googleapis';

/**
 * Helper to create a fresh Express app with the calendar router mounted.
 * Each test gets its own app instance to avoid shared state.
 */
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/calendar', createCalendarRouter());
  return app;
}

describe('Calendar Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/calendar/list', () => {
    it('returns 401 when not authenticated', async () => {
      getAuthenticatedClient.mockReturnValue(null);
      const app = createApp();

      const res = await request(app).get('/api/calendar/list');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Not authenticated');
    });

    it('returns calendar list with colors', async () => {
      getAuthenticatedClient.mockReturnValue({});
      __mockCalendarListList.mockResolvedValue({
        data: {
          items: [
            { id: 'cal1', summary: 'Work', backgroundColor: '#4285f4', primary: true },
            { id: 'cal2', summary: 'Family', backgroundColor: '#33b679', primary: false },
          ],
        },
      });
      const app = createApp();

      const res = await request(app).get('/api/calendar/list');

      expect(res.status).toBe(200);
      // Should have 2 real calendars + 2 demo calendars
      expect(res.body).toHaveLength(4);
      expect(res.body[0]).toEqual({
        id: 'cal1',
        summary: 'Work',
        color: '#4285f4',
        primary: true,
      });
      expect(res.body[1]).toEqual({
        id: 'cal2',
        summary: 'Family',
        color: '#33b679',
        primary: false,
      });
    });

    it('assigns fallback colors when calendar has no background color', async () => {
      getAuthenticatedClient.mockReturnValue({});
      __mockCalendarListList.mockResolvedValue({
        data: {
          items: [
            { id: 'cal1', summary: 'No Color Cal', primary: false },
          ],
        },
      });
      const app = createApp();

      const res = await request(app).get('/api/calendar/list');

      expect(res.status).toBe(200);
      // First fallback color in the palette is red (#E57373)
      expect(res.body[0].color).toBe('#E57373');
    });

    it('handles empty calendar list', async () => {
      getAuthenticatedClient.mockReturnValue({});
      __mockCalendarListList.mockResolvedValue({ data: { items: [] } });
      const app = createApp();

      const res = await request(app).get('/api/calendar/list');

      expect(res.status).toBe(200);
      // Even with no real calendars, demo calendars are appended
      expect(res.body).toHaveLength(2);
      expect(res.body[0].id).toBe('demo-sarah');
    });
  });

  describe('GET /api/calendar/events', () => {
    it('returns 401 when not authenticated', async () => {
      getAuthenticatedClient.mockReturnValue(null);
      const app = createApp();

      const res = await request(app).get('/api/calendar/events');

      expect(res.status).toBe(401);
    });

    it('fetches events for specified calendars', async () => {
      getAuthenticatedClient.mockReturnValue({});
      __mockEventsList.mockResolvedValue({
        data: {
          items: [
            {
              id: 'evt1',
              summary: 'Team Standup',
              start: { dateTime: '2026-06-28T09:00:00-04:00' },
              end: { dateTime: '2026-06-28T09:30:00-04:00' },
              location: 'Room A',
              description: 'Daily sync',
            },
          ],
        },
      });
      const app = createApp();

      const res = await request(app)
        .get('/api/calendar/events')
        .query({
          calendars: 'cal1',
          timeMin: '2026-06-28T00:00:00Z',
          timeMax: '2026-07-05T00:00:00Z',
        });

      expect(res.status).toBe(200);
      // Should contain the real event plus any demo events in range
      const realEvent = res.body.find((e) => e.id === 'evt1');
      expect(realEvent).toBeDefined();
      expect(realEvent).toMatchObject({
        id: 'evt1',
        title: 'Team Standup',
        calendarId: 'cal1',
        allDay: false,
        location: 'Room A',
      });
    });

    it('handles all-day events', async () => {
      getAuthenticatedClient.mockReturnValue({});
      __mockEventsList.mockResolvedValue({
        data: {
          items: [
            {
              id: 'evt2',
              summary: 'Vacation',
              start: { date: '2026-06-29' },
              end: { date: '2026-06-30' },
            },
          ],
        },
      });
      const app = createApp();

      const res = await request(app)
        .get('/api/calendar/events')
        .query({ calendars: 'cal1' });

      expect(res.status).toBe(200);
      const allDayEvent = res.body.find((e) => e.id === 'evt2');
      expect(allDayEvent.allDay).toBe(true);
      expect(allDayEvent.start).toBe('2026-06-29');
    });

    it('assigns (No title) to events without summary', async () => {
      getAuthenticatedClient.mockReturnValue({});
      __mockEventsList.mockResolvedValue({
        data: {
          items: [
            {
              id: 'evt3',
              start: { dateTime: '2026-06-28T10:00:00Z' },
              end: { dateTime: '2026-06-28T11:00:00Z' },
            },
          ],
        },
      });
      const app = createApp();

      const res = await request(app)
        .get('/api/calendar/events')
        .query({ calendars: 'cal1' });

      const noTitleEvent = res.body.find((e) => e.id === 'evt3');
      expect(noTitleEvent.title).toBe('(No title)');
    });

    it('sorts events by start time', async () => {
      getAuthenticatedClient.mockReturnValue({});
      __mockEventsList.mockResolvedValue({
        data: {
          items: [
            { id: 'b', summary: 'Later', start: { dateTime: '2026-06-28T14:00:00Z' }, end: { dateTime: '2026-06-28T15:00:00Z' } },
            { id: 'a', summary: 'Earlier', start: { dateTime: '2026-06-28T09:00:00Z' }, end: { dateTime: '2026-06-28T10:00:00Z' } },
          ],
        },
      });
      const app = createApp();

      const res = await request(app)
        .get('/api/calendar/events')
        .query({ calendars: 'cal1' });

      // Find our events (demo events may be interspersed)
      const ourEvents = res.body.filter((e) => ['a', 'b'].includes(e.id));
      expect(ourEvents[0].title).toBe('Earlier');
      expect(ourEvents[1].title).toBe('Later');
    });

    it('merges events from multiple calendars', async () => {
      getAuthenticatedClient.mockReturnValue({});
      __mockEventsList
        .mockResolvedValueOnce({
          data: { items: [{ id: 'e1', summary: 'Work', start: { dateTime: '2026-06-28T09:00:00Z' }, end: { dateTime: '2026-06-28T10:00:00Z' } }] },
        })
        .mockResolvedValueOnce({
          data: { items: [{ id: 'e2', summary: 'Personal', start: { dateTime: '2026-06-28T11:00:00Z' }, end: { dateTime: '2026-06-28T12:00:00Z' } }] },
        });
      const app = createApp();

      const res = await request(app)
        .get('/api/calendar/events')
        .query({ calendars: 'cal1,cal2' });

      const ourEvents = res.body.filter((e) => ['e1', 'e2'].includes(e.id));
      expect(ourEvents).toHaveLength(2);
    });

    it('gracefully handles calendar fetch errors', async () => {
      getAuthenticatedClient.mockReturnValue({});
      __mockEventsList.mockRejectedValue(new Error('Calendar not found'));
      const app = createApp();

      const res = await request(app)
        .get('/api/calendar/events')
        .query({ calendars: 'bad-cal' });

      // Should still return 200 with demo events (graceful degradation)
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PATCH /api/calendar/events/:id', () => {
    it('returns 401 when not authenticated', async () => {
      getAuthenticatedClient.mockReturnValue(null);
      const app = createApp();

      const res = await request(app)
        .patch('/api/calendar/events/evt1')
        .send({ calendarId: 'cal1', start: '2026-06-29T09:00:00Z' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Not authenticated');
    });

    it('returns 400 when calendarId is missing', async () => {
      getAuthenticatedClient.mockReturnValue({});
      const app = createApp();

      const res = await request(app)
        .patch('/api/calendar/events/evt1')
        .send({ start: '2026-06-29T09:00:00Z' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('calendarId is required');
    });

    it('handles demo event updates locally (no API call)', async () => {
      getAuthenticatedClient.mockReturnValue({});
      const app = createApp();

      const res = await request(app)
        .patch('/api/calendar/events/demo-sarah-0')
        .send({
          calendarId: 'demo-sarah',
          title: 'Updated Demo Event',
          start: '2026-06-29T10:00:00Z',
          end: '2026-06-29T11:00:00Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Demo Event');
      expect(res.body.id).toBe('demo-sarah-0');
      // Google API should not have been called for demo events
      expect(__mockEventsPatch).not.toHaveBeenCalled();
    });

    it('updates a real event via Google Calendar API', async () => {
      getAuthenticatedClient.mockReturnValue({});
      __mockEventsPatch.mockResolvedValue({
        data: {
          id: 'evt1',
          summary: 'Rescheduled Meeting',
          start: { dateTime: '2026-06-29T10:00:00Z' },
          end: { dateTime: '2026-06-29T11:00:00Z' },
          location: 'Room B',
          description: 'Moved to Tuesday',
        },
      });
      const app = createApp();

      const res = await request(app)
        .patch('/api/calendar/events/evt1')
        .send({
          calendarId: 'cal1',
          title: 'Rescheduled Meeting',
          start: '2026-06-29T10:00:00Z',
          end: '2026-06-29T11:00:00Z',
          description: 'Moved to Tuesday',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Rescheduled Meeting');
      expect(res.body.calendarId).toBe('cal1');

      // Verify the API was called with the correct parameters
      expect(__mockEventsPatch).toHaveBeenCalledWith({
        calendarId: 'cal1',
        eventId: 'evt1',
        requestBody: {
          summary: 'Rescheduled Meeting',
          start: { dateTime: '2026-06-29T10:00:00Z' },
          end: { dateTime: '2026-06-29T11:00:00Z' },
          description: 'Moved to Tuesday',
        },
      });
    });

    it('only sends provided fields to Google (partial update)', async () => {
      getAuthenticatedClient.mockReturnValue({});
      __mockEventsPatch.mockResolvedValue({
        data: {
          id: 'evt1',
          summary: 'Original Title',
          start: { dateTime: '2026-06-30T14:00:00Z' },
          end: { dateTime: '2026-06-30T15:00:00Z' },
        },
      });
      const app = createApp();

      // Only updating the time, not the title or description
      const res = await request(app)
        .patch('/api/calendar/events/evt1')
        .send({
          calendarId: 'cal1',
          start: '2026-06-30T14:00:00Z',
          end: '2026-06-30T15:00:00Z',
        });

      expect(res.status).toBe(200);
      // The requestBody should not include summary or description
      expect(__mockEventsPatch).toHaveBeenCalledWith({
        calendarId: 'cal1',
        eventId: 'evt1',
        requestBody: {
          start: { dateTime: '2026-06-30T14:00:00Z' },
          end: { dateTime: '2026-06-30T15:00:00Z' },
        },
      });
    });

    it('returns 500 when Google API fails', async () => {
      getAuthenticatedClient.mockReturnValue({});
      __mockEventsPatch.mockRejectedValue(new Error('API error'));
      const app = createApp();

      const res = await request(app)
        .patch('/api/calendar/events/evt1')
        .send({
          calendarId: 'cal1',
          title: 'Will Fail',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update event');
    });
  });
});
