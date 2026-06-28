import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createCalendarRouter } from '../src/routes/calendar.js';

vi.mock('node-cache', () => {
  return {
    default: class {
      get() { return undefined; }
      set() {}
    },
  };
});

vi.mock('../src/routes/auth.js', () => ({
  getAuthenticatedClient: vi.fn(),
}));

vi.mock('googleapis', () => {
  const mockList = vi.fn();
  const mockEventsList = vi.fn();
  return {
    google: {
      calendar: () => ({
        calendarList: { list: mockList },
        events: { list: mockEventsList },
      }),
    },
    __mockCalendarListList: mockList,
    __mockEventsList: mockEventsList,
  };
});

import { getAuthenticatedClient } from '../src/routes/auth.js';
import { __mockCalendarListList, __mockEventsList } from 'googleapis';

function createApp() {
  const app = express();
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
      expect(res.body).toHaveLength(2);
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
      expect(res.body[0].color).toBe('#E57373');
    });

    it('handles empty calendar list', async () => {
      getAuthenticatedClient.mockReturnValue({});
      __mockCalendarListList.mockResolvedValue({ data: { items: [] } });
      const app = createApp();

      const res = await request(app).get('/api/calendar/list');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
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
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
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
      expect(res.body[0].allDay).toBe(true);
      expect(res.body[0].start).toBe('2026-06-29');
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

      expect(res.body[0].title).toBe('(No title)');
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

      expect(res.body[0].title).toBe('Earlier');
      expect(res.body[1].title).toBe('Later');
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

      expect(res.body).toHaveLength(2);
    });

    it('gracefully handles calendar fetch errors', async () => {
      getAuthenticatedClient.mockReturnValue({});
      __mockEventsList.mockRejectedValue(new Error('Calendar not found'));
      const app = createApp();

      const res = await request(app)
        .get('/api/calendar/events')
        .query({ calendars: 'bad-cal' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
