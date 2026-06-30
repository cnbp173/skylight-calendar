/**
 * useCalendarData Hook
 *
 * Manages fetching, caching, and updating calendar data from the server.
 * This hook is the single source of truth for calendar and event state
 * in the React app.
 *
 * Features:
 *   - Fetches the list of connected calendars on mount
 *   - Fetches events for the current week (adjusted by weekOffset)
 *   - Auto-refreshes every 5 minutes to stay in sync with Google Calendar
 *   - Provides an updateEvent function for drag-and-drop and edit dialog changes
 *   - Applies optimistic UI updates (immediate local state change) with
 *     server confirmation and rollback on failure
 *
 * @param {boolean} authenticated - Whether the user has connected Google Calendar
 * @param {number} weekOffset - Number of weeks offset from the current week (0 = this week)
 * @returns {{ calendars, events, loading, updateEvent }} Calendar state and mutation function
 */

import { useState, useEffect, useCallback } from 'react';

export function useCalendarData(authenticated, weekOffset = 0) {
  // List of connected calendars (each has id, summary, color, primary)
  const [calendars, setCalendars] = useState([]);

  // Array of events currently displayed on the week view
  const [events, setEvents] = useState([]);

  // True while the initial fetch is in progress (shows loading spinner)
  const [loading, setLoading] = useState(true);

  /**
   * Fetches the list of calendars from the server.
   * Called once on mount and again on each 5-minute refresh cycle.
   *
   * @returns {Array} The fetched calendar list, or empty array on failure
   */
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

  /**
   * Fetches events for the current week from the server.
   * Computes the time window based on weekOffset (0 = this week,
   * -1 = last week, +1 = next week, etc.).
   *
   * @param {Array} calendarList - The calendars to fetch events from
   */
  const fetchEvents = useCallback(async (calendarList) => {
    if (!calendarList.length) return;
    setLoading(true);
    try {
      // Build the comma-separated list of calendar IDs for the query
      const ids = calendarList.map((c) => c.id).join(',');

      // Calculate the start/end of the target week
      const now = new Date();
      const start = startOfWeek(now);
      start.setDate(start.getDate() + weekOffset * 7);
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
  }, [weekOffset]);

  /**
   * Updates an event both locally (optimistic) and on the server.
   * Used by drag-and-drop (changes start/end times) and the edit dialog
   * (changes title, description, date, or time).
   *
   * Strategy:
   *   1. Immediately update local state so the UI feels responsive
   *   2. Send PATCH request to server (which forwards to Google Calendar)
   *   3. On failure, revert local state and surface the error
   *
   * @param {string} eventId - The ID of the event to update
   * @param {object} updates - Fields to change (title, start, end, description, calendarId)
   * @returns {Promise<boolean>} True if the update succeeded, false otherwise
   */
  const updateEvent = useCallback(async (eventId, updates) => {
    // Snapshot current state for rollback on failure
    const previousEvents = [...events];

    // Optimistic update: merge changes into the event immediately
    setEvents((current) =>
      current.map((evt) =>
        evt.id === eventId ? { ...evt, ...updates } : evt
      )
    );

    try {
      const res = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        // Server rejected the update — roll back to previous state
        console.error('Failed to update event:', await res.text());
        setEvents(previousEvents);
        return false;
      }

      return true;
    } catch (e) {
      // Network error — roll back
      console.error('Failed to update event:', e);
      setEvents(previousEvents);
      return false;
    }
  }, [events]);

  /**
   * Initial load and periodic refresh.
   * Fetches calendars then events immediately, then sets up a 5-minute
   * interval to keep the display fresh without manual interaction.
   */
  useEffect(() => {
    if (!authenticated) return;

    const load = async () => {
      const cals = await fetchCalendars();
      await fetchEvents(cals);
    };

    load();

    // Refresh every 5 minutes to pick up changes made in Google Calendar
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [authenticated, fetchCalendars, fetchEvents]);

  return { calendars, events, loading, updateEvent };
}

/**
 * Calculates midnight on Sunday of the week containing the given date.
 * Sunday is day 0 in JavaScript's getDay().
 *
 * @param {Date} date - Any date within the target week
 * @returns {Date} Midnight on Sunday of that week
 */
function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}
