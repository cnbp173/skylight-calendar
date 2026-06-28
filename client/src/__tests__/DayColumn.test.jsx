import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DayColumn from '../components/DayColumn.jsx';

describe('DayColumn', () => {
  const monday = new Date('2026-06-29T00:00:00');

  it('renders day name and number', () => {
    render(<DayColumn date={monday} events={[]} isToday={false} colorMap={{}} />);

    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('29')).toBeInTheDocument();
  });

  it('shows "No events" when there are no events', () => {
    render(<DayColumn date={monday} events={[]} isToday={false} colorMap={{}} />);

    expect(screen.getByText('No events')).toBeInTheDocument();
  });

  it('renders events when provided', () => {
    const events = [
      { id: '1', title: 'Morning Run', start: '2026-06-29T07:00:00', end: '2026-06-29T08:00:00', allDay: false, calendarId: 'cal1' },
      { id: '2', title: 'Work', start: '2026-06-29T09:00:00', end: '2026-06-29T17:00:00', allDay: false, calendarId: 'cal1' },
    ];

    render(<DayColumn date={monday} events={events} isToday={false} colorMap={{ cal1: '#4285f4' }} />);

    expect(screen.getByText('Morning Run')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.queryByText('No events')).not.toBeInTheDocument();
  });

  it('applies today highlight styling', () => {
    const { container } = render(
      <DayColumn date={monday} events={[]} isToday={true} colorMap={{}} />
    );

    const column = container.firstChild;
    expect(column.style.background).toBe('var(--today-highlight)');
  });

  it('does not apply today styling for non-today days', () => {
    const { container } = render(
      <DayColumn date={monday} events={[]} isToday={false} colorMap={{}} />
    );

    const column = container.firstChild;
    expect(column.style.background).toBe('var(--bg-secondary)');
  });
});
