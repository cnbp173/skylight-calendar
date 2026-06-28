import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventCard from '../components/EventCard.jsx';

describe('EventCard', () => {
  it('renders event title', () => {
    const event = {
      id: '1',
      title: 'Team Meeting',
      start: '2026-06-28T14:00:00Z',
      end: '2026-06-28T15:00:00Z',
      allDay: false,
    };

    render(<EventCard event={event} color="#4285f4" />);

    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
  });

  it('displays time for timed events', () => {
    const event = {
      id: '1',
      title: 'Lunch',
      start: '2026-06-28T12:00:00',
      end: '2026-06-28T13:00:00',
      allDay: false,
    };

    render(<EventCard event={event} />);

    expect(screen.getByText(/12:00/)).toBeInTheDocument();
  });

  it('displays "All day" for all-day events', () => {
    const event = {
      id: '2',
      title: 'Birthday',
      start: '2026-06-28',
      end: '2026-06-29',
      allDay: true,
    };

    render(<EventCard event={event} color="#33b679" />);

    expect(screen.getByText('All day')).toBeInTheDocument();
  });

  it('shows location when provided', () => {
    const event = {
      id: '3',
      title: 'Doctor Appointment',
      start: '2026-06-28T10:00:00Z',
      end: '2026-06-28T11:00:00Z',
      allDay: false,
      location: '123 Main St',
    };

    render(<EventCard event={event} color="#E57373" />);

    expect(screen.getByText('123 Main St')).toBeInTheDocument();
  });

  it('does not render location when not provided', () => {
    const event = {
      id: '4',
      title: 'Quick Call',
      start: '2026-06-28T15:00:00Z',
      end: '2026-06-28T15:30:00Z',
      allDay: false,
      location: null,
    };

    render(<EventCard event={event} />);

    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });

  it('applies color to border', () => {
    const event = {
      id: '5',
      title: 'Colored Event',
      start: '2026-06-28T09:00:00Z',
      end: '2026-06-28T10:00:00Z',
      allDay: false,
    };

    const { container } = render(<EventCard event={event} color="#BA68C8" />);

    const card = container.firstChild;
    expect(card.style.borderLeftColor).toBe('rgb(186, 104, 200)');
  });

  it('uses default color when none provided', () => {
    const event = {
      id: '6',
      title: 'Default Color',
      start: '2026-06-28T09:00:00Z',
      end: '2026-06-28T10:00:00Z',
      allDay: false,
    };

    const { container } = render(<EventCard event={event} />);

    const card = container.firstChild;
    expect(card.style.borderLeftColor).toBe('rgb(100, 181, 246)');
  });
});
