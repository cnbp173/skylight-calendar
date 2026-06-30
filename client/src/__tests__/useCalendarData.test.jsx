/**
 * useCalendarData Hook — Unit Tests
 *
 * Tests the calendar data fetching and mutation logic:
 *   - Fetches calendars and events on mount when authenticated
 *   - Does not fetch when not authenticated
 *   - Updates events optimistically and rolls back on failure
 *   - Handles network errors gracefully
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCalendarData } from '../hooks/useCalendarData.js';

describe('useCalendarData', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not fetch when not authenticated', () => {
    renderHook(() => useCalendarData(false, 0));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches calendars and events when authenticated', async () => {
    // First call: fetch calendars, second call: fetch events
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 'cal1', summary: 'Work', color: '#4285f4', primary: true },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 'evt1', title: 'Meeting', start: '2026-06-28T09:00:00Z', end: '2026-06-28T10:00:00Z' },
        ]),
      });

    const { result } = renderHook(() => useCalendarData(true, 0));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.calendars).toHaveLength(1);
    expect(result.current.calendars[0].summary).toBe('Work');
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].title).toBe('Meeting');
  });

  it('provides an updateEvent function that updates locally', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'cal1', summary: 'Work', color: '#4285f4', primary: true }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 'evt1', calendarId: 'cal1', title: 'Original', start: '2026-06-28T09:00:00Z', end: '2026-06-28T10:00:00Z' },
        ]),
      });

    const { result } = renderHook(() => useCalendarData(true, 0));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Mock the PATCH request for the update
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'evt1', title: 'Updated' }),
    });

    let success;
    await act(async () => {
      success = await result.current.updateEvent('evt1', {
        calendarId: 'cal1',
        title: 'Updated',
      });
    });

    expect(success).toBe(true);
    expect(result.current.events[0].title).toBe('Updated');
  });

  it('rolls back optimistic update on server failure', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'cal1', summary: 'Work', color: '#4285f4', primary: true }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 'evt1', calendarId: 'cal1', title: 'Original', start: '2026-06-28T09:00:00Z', end: '2026-06-28T10:00:00Z' },
        ]),
      });

    const { result } = renderHook(() => useCalendarData(true, 0));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Mock a failed PATCH
    fetchMock.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('Server error'),
    });

    let success;
    await act(async () => {
      success = await result.current.updateEvent('evt1', {
        calendarId: 'cal1',
        title: 'Should Not Stick',
      });
    });

    expect(success).toBe(false);
    expect(result.current.events[0].title).toBe('Original');
  });

  it('rolls back on network error', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'cal1', summary: 'Work', color: '#4285f4', primary: true }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 'evt1', calendarId: 'cal1', title: 'Original', start: '2026-06-28T09:00:00Z', end: '2026-06-28T10:00:00Z' },
        ]),
      });

    const { result } = renderHook(() => useCalendarData(true, 0));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Mock a network failure
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    let success;
    await act(async () => {
      success = await result.current.updateEvent('evt1', {
        calendarId: 'cal1',
        title: 'Should Not Stick',
      });
    });

    expect(success).toBe(false);
    expect(result.current.events[0].title).toBe('Original');
  });

  it('provides a createEvent function that adds the new event to the list', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'cal1', summary: 'Work', color: '#4285f4', primary: true }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 'evt1', calendarId: 'cal1', title: 'Existing', start: '2026-06-28T09:00:00Z', end: '2026-06-28T10:00:00Z' },
        ]),
      });

    const { result } = renderHook(() => useCalendarData(true, 0));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Mock a successful POST response for creating an event
    const newEvent = {
      id: 'evt2',
      calendarId: 'cal1',
      title: 'New Meeting',
      start: '2026-06-28T11:00:00Z',
      end: '2026-06-28T12:00:00Z',
      description: 'Planning session',
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(newEvent),
    });

    let success;
    await act(async () => {
      success = await result.current.createEvent({
        calendarId: 'cal1',
        title: 'New Meeting',
        start: '2026-06-28T11:00:00Z',
        end: '2026-06-28T12:00:00Z',
        description: 'Planning session',
      });
    });

    expect(success).toBe(true);
    expect(result.current.events).toHaveLength(2);
    expect(result.current.events[1].title).toBe('New Meeting');
    expect(result.current.events[1].id).toBe('evt2');
  });
});
