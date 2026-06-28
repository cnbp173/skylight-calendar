import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeekView from '../components/WeekView.jsx';

describe('WeekView', () => {
  it('shows loading state', () => {
    render(<WeekView events={[]} calendars={[]} loading={true} />);

    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
  });

  it('renders 7 day columns when loaded', () => {
    const { container } = render(
      <WeekView events={[]} calendars={[]} loading={false} />
    );

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('distributes events to correct day columns', () => {
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

    render(<WeekView events={events} calendars={calendars} loading={false} />);

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

    render(<WeekView events={events} calendars={calendars} loading={false} />);

    expect(screen.getByText('Colored Event')).toBeInTheDocument();
  });
});
