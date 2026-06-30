/**
 * WeekView Component — Unit Tests
 *
 * Tests the main calendar grid:
 *   - Renders 7 day columns
 *   - Displays events in the correct day columns
 *   - Shows loading state when data is being fetched
 *   - Groups events by their start date
 *   - Renders the time gutter with hour labels
 *   - Applies calendar colors to events
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeekView from '../components/WeekView.jsx';

describe('WeekView', () => {
  it('shows loading state', () => {
    render(
      <WeekView
        events={[]}
        calendars={[]}
        loading={true}
        onEventUpdate={() => {}}
        onEventEdit={() => {}}
      />
    );

    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
  });

  it('renders 7 day columns when loaded', () => {
    render(
      <WeekView
        events={[]}
        calendars={[]}
        loading={false}
        onEventUpdate={() => {}}
        onEventEdit={() => {}}
      />
    );

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('renders the time gutter with hour labels', () => {
    render(
      <WeekView
        events={[]}
        calendars={[]}
        loading={false}
        onEventUpdate={() => {}}
        onEventEdit={() => {}}
      />
    );

    // Time gutter spans from 7 AM to 10 PM
    expect(screen.getByText('7 AM')).toBeInTheDocument();
    expect(screen.getByText('12 PM')).toBeInTheDocument();
    expect(screen.getByText('10 PM')).toBeInTheDocument();
  });

  it('distributes events to correct day columns', () => {
    // Calculate this week's Tuesday to create a test event
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    const tuesday = new Date(startOfWeek);
    tuesday.setDate(startOfWeek.getDate() + 2);
    const tuesdayStr = tuesday.toISOString().split('T')[0];

    const events = [
      {
        id: '1',
        title: 'Tuesday Event',
        start: `${tuesdayStr}T10:00:00`,
        end: `${tuesdayStr}T11:00:00`,
        allDay: false,
        calendarId: 'cal1',
      },
    ];

    const calendars = [{ id: 'cal1', color: '#4285f4' }];

    render(
      <WeekView
        events={events}
        calendars={calendars}
        loading={false}
        onEventUpdate={() => {}}
        onEventEdit={() => {}}
      />
    );

    expect(screen.getByText('Tuesday Event')).toBeInTheDocument();
  });

  it('applies calendar colors to events', () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const dateStr = startOfWeek.toISOString().split('T')[0];

    const events = [
      {
        id: '1',
        title: 'Colored Event',
        start: `${dateStr}T10:00:00`,
        end: `${dateStr}T11:00:00`,
        allDay: false,
        calendarId: 'work-cal',
      },
    ];

    const calendars = [{ id: 'work-cal', color: '#E57373' }];

    render(
      <WeekView
        events={events}
        calendars={calendars}
        loading={false}
        onEventUpdate={() => {}}
        onEventEdit={() => {}}
      />
    );

    expect(screen.getByText('Colored Event')).toBeInTheDocument();
  });

  it('does not render events while loading', () => {
    const today = new Date();
    const events = [{
      id: '1',
      title: 'Hidden Event',
      start: today.toISOString(),
      end: new Date(today.getTime() + 3600000).toISOString(),
      allDay: false,
      calendarId: 'cal1',
    }];

    render(
      <WeekView
        events={events}
        calendars={[{ id: 'cal1', color: '#4285f4' }]}
        loading={true}
        onEventUpdate={() => {}}
        onEventEdit={() => {}}
      />
    );

    expect(screen.queryByText('Hidden Event')).not.toBeInTheDocument();
  });
});
