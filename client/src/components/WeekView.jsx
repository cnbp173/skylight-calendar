/**
 * WeekView Component
 *
 * The main calendar grid displaying 7 day columns side by side.
 * Integrates @dnd-kit for drag-and-drop event rescheduling within
 * the visible week.
 *
 * Drag-and-drop behavior:
 *   - Events can be dragged from one day column to another
 *   - When dropped, the event's date changes to the target day while
 *     preserving its start/end times (duration stays the same)
 *   - Only works within the currently visible week — for rescheduling
 *     to a different week, users double-click to open the edit dialog
 *
 * The time gutter on the left shows hour labels (7 AM – 10 PM) aligned
 * with the time grid inside each day column.
 *
 * Props:
 *   @param {Array} events - All events for the current week
 *   @param {Array} calendars - Calendar metadata (for color mapping)
 *   @param {boolean} loading - Whether events are still being fetched
 *   @param {number} weekOffset - Current week offset (for date calculation)
 *   @param {function} onEventUpdate - Callback to persist event changes
 *   @param {function} onEventEdit - Callback to open the edit dialog on double-click
 */

import React, { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import DayColumn from './DayColumn.jsx';
import EventCard from './EventCard.jsx';

/** First hour shown in the time grid (7 AM) */
const DAY_START_HOUR = 7;

/** Last hour shown in the time grid (10 PM) */
const DAY_END_HOUR = 22;

export default function WeekView({ events, calendars, loading, weekOffset = 0, onEventUpdate, onEventEdit }) {
  // Track which event is currently being dragged (for the drag overlay)
  const [activeEvent, setActiveEvent] = useState(null);

  /**
   * Configure the pointer sensor with a 5px activation distance.
   * This prevents accidental drags when the user just clicks or
   * slightly nudges the touchpad on the iPazzPort keyboard.
   * The distance threshold ensures a deliberate drag gesture is needed.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Calculate the 7 days that make up this week
  const days = getWeekDays(weekOffset);
  const today = new Date().toDateString();

  // Build a lookup map: calendarId → color string
  // Used to color-code event cards by their source calendar
  const calendarColorMap = {};
  calendars.forEach((cal) => {
    calendarColorMap[cal.id] = cal.color;
  });

  // Group events into buckets by day for rendering in the correct column
  const eventsByDay = groupEventsByDay(events, days);

  // Show a loading indicator while the first fetch is in progress
  if (loading) {
    return (
      <div style={styles.loading}>
        <p style={styles.loadingText}>Loading calendar...</p>
      </div>
    );
  }

  // Generate the array of hour labels for the time gutter
  const hours = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
    hours.push(h);
  }

  /**
   * Called when the user starts dragging an event.
   * Stores the active event so we can render a drag overlay
   * (a floating copy of the event card that follows the cursor).
   */
  const handleDragStart = (event) => {
    const draggedEvent = events.find((e) => e.id === event.active.id);
    setActiveEvent(draggedEvent);
  };

  /**
   * Called when the user drops an event onto a day column.
   * Calculates the new date for the event (keeping the same time)
   * and calls onEventUpdate to persist the change.
   *
   * If the drop target is not a valid day column, the drag is cancelled
   * (event snaps back to its original position).
   */
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveEvent(null);

    // No valid drop target — cancel the drag
    if (!over) return;

    // Find the event being moved
    const draggedEvent = events.find((e) => e.id === active.id);
    if (!draggedEvent) return;

    // The drop target ID is the ISO date string of the target day
    const targetDateStr = over.id;
    const targetDate = new Date(targetDateStr);

    // Parse the event's current start and end times
    const currentStart = new Date(draggedEvent.start);
    const currentEnd = new Date(draggedEvent.end);

    // Calculate the duration so we can preserve it on the new date
    const durationMs = currentEnd.getTime() - currentStart.getTime();

    // Build the new start time: target day + original time-of-day
    const newStart = new Date(targetDate);
    newStart.setHours(currentStart.getHours(), currentStart.getMinutes(), 0, 0);

    // Build the new end time by adding the original duration
    const newEnd = new Date(newStart.getTime() + durationMs);

    // Only update if the date actually changed (avoid unnecessary API calls)
    if (newStart.toISOString() === currentStart.toISOString()) return;

    // Persist the change via the updateEvent callback
    onEventUpdate(draggedEvent.id, {
      calendarId: draggedEvent.calendarId,
      start: newStart.toISOString(),
      end: newEnd.toISOString(),
    });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={styles.container}>
        {/* Time gutter — hour labels running down the left side */}
        <div style={styles.timeGutter}>
          <div style={styles.gutterHeader} />
          <div style={styles.gutterBody}>
            {hours.map((h) => (
              <div key={h} style={styles.gutterHour}>
                <span style={styles.gutterLabel}>
                  {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 7-column grid — one DayColumn per day of the week */}
        <div style={styles.grid}>
          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              date={day}
              events={eventsByDay[day.toDateString()] || []}
              isToday={day.toDateString() === today}
              colorMap={calendarColorMap}
              dayStartHour={DAY_START_HOUR}
              dayEndHour={DAY_END_HOUR}
              onEventEdit={onEventEdit}
            />
          ))}
        </div>
      </div>

      {/**
       * DragOverlay renders a floating copy of the event card that follows
       * the cursor during a drag. This is rendered outside the normal layout
       * so it isn't clipped by overflow:hidden on day columns.
       */}
      <DragOverlay>
        {activeEvent ? (
          <EventCard
            event={activeEvent}
            color={calendarColorMap[activeEvent.calendarId]}
            compact={false}
            isDragOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Calculates the 7 days of the week to display, adjusted by weekOffset.
 * Week starts on Sunday (getDay() === 0).
 *
 * @param {number} weekOffset - Weeks before/after current week (0 = this week)
 * @returns {Date[]} Array of 7 Date objects (Sun through Sat)
 */
function getWeekDays(weekOffset = 0) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - start.getDay() + weekOffset * 7);
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/**
 * Groups an array of events into a map keyed by date string.
 * Each event is placed in the bucket corresponding to its start date.
 *
 * @param {Array} events - All events for the week
 * @param {Date[]} days - The 7 days of the current week
 * @returns {Object} Map of dateString → event array
 */
function groupEventsByDay(events, days) {
  const groups = {};
  days.forEach((d) => {
    groups[d.toDateString()] = [];
  });

  events.forEach((event) => {
    const eventDate = new Date(event.start);
    const key = eventDate.toDateString();
    if (groups[key]) {
      groups[key].push(event);
    }
  });

  return groups;
}

/** Component styles */
const styles = {
  container: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  timeGutter: {
    display: 'flex',
    flexDirection: 'column',
    width: '52px',
    flexShrink: 0,
  },
  gutterHeader: {
    height: '48px',
    flexShrink: 0,
  },
  gutterBody: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  gutterHour: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingRight: '8px',
  },
  gutterLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    transform: 'translateY(-6px)',
    whiteSpace: 'nowrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    flex: 1,
    minWidth: 0,
  },
  loading: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: '18px',
    color: 'var(--text-muted)',
  },
};
