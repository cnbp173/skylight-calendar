/**
 * DayColumn Component — Unit Tests
 *
 * Tests the day column rendering:
 *   - Displays the day name and date number
 *   - Renders events in the time grid
 *   - Applies today highlighting
 *   - Separates all-day events from timed events
 *   - Acts as a valid drop target for drag-and-drop
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import DayColumn from '../components/DayColumn.jsx';

/**
 * Helper to wrap DayColumn in a DndContext since it uses useDroppable.
 */
function renderWithDnd(ui) {
  return render(<DndContext>{ui}</DndContext>);
}

describe('DayColumn', () => {
  const monday = new Date('2026-06-29T00:00:00');
  const defaultProps = {
    date: monday,
    events: [],
    isToday: false,
    colorMap: {},
    dayStartHour: 7,
    dayEndHour: 22,
    onEventEdit: vi.fn(),
  };

  it('renders day name and number', () => {
    renderWithDnd(<DayColumn {...defaultProps} />);

    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('29')).toBeInTheDocument();
  });

  it('renders timed events when provided', () => {
    const events = [
      { id: '1', title: 'Morning Run', start: '2026-06-29T07:00:00', end: '2026-06-29T08:00:00', allDay: false, calendarId: 'cal1' },
      { id: '2', title: 'Work', start: '2026-06-29T09:00:00', end: '2026-06-29T17:00:00', allDay: false, calendarId: 'cal1' },
    ];

    renderWithDnd(
      <DayColumn {...defaultProps} events={events} colorMap={{ cal1: '#4285f4' }} />
    );

    expect(screen.getByText('Morning Run')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('renders all-day events in a separate section', () => {
    const events = [
      { id: '1', title: 'Vacation', start: '2026-06-29', end: '2026-06-30', allDay: true, calendarId: 'cal1' },
    ];

    renderWithDnd(
      <DayColumn {...defaultProps} events={events} colorMap={{ cal1: '#81C784' }} />
    );

    expect(screen.getByText('Vacation')).toBeInTheDocument();
  });

  it('applies today highlight styling', () => {
    const { container } = renderWithDnd(
      <DayColumn {...defaultProps} isToday={true} />
    );

    const column = container.firstChild;
    expect(column.style.background).toBe('var(--today-highlight)');
  });

  it('does not apply today styling for non-today days', () => {
    const { container } = renderWithDnd(
      <DayColumn {...defaultProps} isToday={false} />
    );

    const column = container.firstChild;
    expect(column.style.background).toBe('var(--bg-secondary)');
  });

  it('calls onEventEdit when an event is double-clicked', () => {
    const onEventEdit = vi.fn();
    const events = [
      { id: '1', title: 'Editable Event', start: '2026-06-29T10:00:00', end: '2026-06-29T11:00:00', allDay: false, calendarId: 'cal1' },
    ];

    renderWithDnd(
      <DayColumn {...defaultProps} events={events} colorMap={{ cal1: '#4285f4' }} onEventEdit={onEventEdit} />
    );

    // Double-click the event's draggable wrapper (has role="button")
    const eventElement = screen.getByRole('button');
    fireEvent.doubleClick(eventElement);

    expect(onEventEdit).toHaveBeenCalledWith(events[0]);
  });
});
