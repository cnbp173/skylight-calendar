import { useState, useEffect, useCallback } from 'react';

export function useCalendarData(authenticated) {
  const [calendars, setCalendars] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendars = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar/list');
      if (res.ok) {
        const data = await res.json();
        setCalendars(data);
        return data;
      }
    } catch (e) {
      console.error('Failed to fetch calendars:', e);
    }
    return [];
  }, []);

  const fetchEvents = useCallback(async (calendarList) => {
    if (!calendarList.length) return;
    try {
      const ids = calendarList.map((c) => c.id).join(',');
      const now = new Date();
      const start = startOfWeek(now);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const params = new URLSearchParams({
        calendars: ids,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
      });

      const res = await fetch(`/api/calendar/events?${params}`);
      if (res.ok) {
        setEvents(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch events:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    const load = async () => {
      const cals = await fetchCalendars();
      await fetchEvents(cals);
    };

    load();
    const interval = setInterval(load, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [authenticated, fetchCalendars, fetchEvents]);

  return { calendars, events, loading };
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}
