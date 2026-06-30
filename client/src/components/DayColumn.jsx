/**
 * DayColumn Component
 *
 * Renders a single day in the week view grid. Contains:
 *   - A header showing the day name (Mon, Tue, etc.) and date number
 *   - An optional all-day events section
 *   - A time grid where timed events are positioned absolutely based
 *     on their start/end times
 *
 * This component acts as a "droppable" zone for @dnd-kit — dragged events
 * can be dropped here to reschedule them to this day.
 *
 * Props:
 *   @param {Date} date - The date this column represents
 *   @param {Array} events - Events occurring on this day
 *   @param {boolean} isToday - Whether this is today's date (for highlighting)
 *   @param {Object} colorMap - Lookup from calendarId to color hex string
 *   @param {number} dayStartHour - First hour shown in the grid (e.g., 7)
 *   @param {number} dayEndHour - Last hour shown in the grid (e.g., 22)
 *   @param {function} onEventEdit - Callback when user double-clicks an event
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import DraggableEvent from './DraggableEvent.jsx';
import EventCard from './EventCard.jsx';

export default function DayColumn({ date, events, isToday, colorMap, dayStartHour, dayEndHour, onEventEdit }) {
  // Format the day name and number for the column header
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = date.getDate();

  // Total hours displayed — used to calculate percentage positions
  const totalHours = dayEndHour - dayStartHour;

  // Separate all-day events from timed events (they're rendered differently)
  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);

  /**
   * Register this column as a droppable target with @dnd-kit.
   * The ID is the date's ISO string — when an event is dropped here,
   * the WeekView uses this ID to determine which day to move the event to.
   *
   * isOver is true when a dragged item hovers over this column,
   * used to apply visual feedback (highlighted background).
   */
  const { setNodeRef, isOver } = useDroppable({
    id: date.toISOString(),
  });

  // Combine base styles with conditional today/drop-target highlighting
  const columnStyle = {
    ...styles.column,
    ...(isToday ? styles.today : {}),
    ...(isOver ? styles.dropTarget : {}),
  };

  return (
    <div ref={setNodeRef} style={columnStyle}>
      {/* Day header — shows abbreviated day name and date number */}
      <div style={styles.header}>
        <span style={{ ...styles.dayName, ...(isToday ? styles.todayText : {}) }}>
          {dayName}
        </span>
        <span style={{ ...styles.dayNum, ...(isToday ? styles.todayNum : {}) }}>
          {dayNum}
        </span>
      </div>

      {/* All-day events section — shown as compact cards above the time grid */}
      {allDayEvents.length > 0 && (
        <div style={styles.allDay}>
          {allDayEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              color={colorMap[event.calendarId]}
              compact
            />
          ))}
        </div>
      )}

      {/* Time grid — events are positioned absolutely based on their time */}
      <div style={styles.timeGrid}>
        {/* Horizontal grid lines marking each hour */}
        {Array.from({ length: totalHours }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${(i / totalHours) * 100}%`,
              left: 0,
              right: 0,
              borderTop: '1px solid var(--border)',
            }}
          />
        ))}

        {/* Render each timed event as a positioned, draggable card */}
        {timedEvents.map((event) => {
          const startDate = new Date(event.start);
          const endDate = new Date(event.end);

          // Convert times to minutes since midnight for position calculations
          const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
          const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

          // Calculate the visible grid boundaries in minutes
          const gridStartMinutes = dayStartHour * 60;
          const gridEndMinutes = dayEndHour * 60;
          const gridTotalMinutes = gridEndMinutes - gridStartMinutes;

          // Top position as a percentage of the grid height
          const topPct = Math.max(0, (startMinutes - gridStartMinutes) / gridTotalMinutes) * 100;

          // Height as a percentage — minimum 20 minutes so very short events are visible
          const durationMinutes = Math.max(endMinutes - startMinutes, 20);
          const heightPct = Math.min(
            (durationMinutes / gridTotalMinutes) * 100,
            100 - topPct
          );

          return (
            <DraggableEvent
              key={event.id}
              event={event}
              style={{
                position: 'absolute',
                top: `${topPct}%`,
                height: `${heightPct}%`,
                left: '2px',
                right: '2px',
                minHeight: '18px',
              }}
              onDoubleClick={() => onEventEdit(event)}
            >
              <EventCard
                event={event}
                color={colorMap[event.calendarId]}
                compact={heightPct < 8}
              />
            </DraggableEvent>
          );
        })}
      </div>
    </div>
  );
}

/** Component styles */
const styles = {
  column: {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
    transition: 'background 0.15s ease',
  },
  today: {
    background: 'var(--today-highlight)',
    boxShadow: '0 0 0 2px #f6c944, var(--shadow)',
  },
  dropTarget: {
    background: 'var(--drag-highlight)',
    boxShadow: '0 0 0 2px var(--focus-ring), var(--shadow)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 4px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    height: '48px',
    justifyContent: 'center',
  },
  dayName: {
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  dayNum: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  todayText: {
    color: '#d69e2e',
    fontWeight: 600,
  },
  todayNum: {
    color: '#d69e2e',
  },
  allDay: {
    padding: '4px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flexShrink: 0,
  },
  timeGrid: {
    position: 'relative',
    flex: 1,
    overflow: 'hidden',
  },
};
