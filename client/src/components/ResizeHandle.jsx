/**
 * ResizeHandle Component
 *
 * A drag handle rendered at the bottom edge of timed event cards that allows
 * the user to vertically resize the event — extending or shortening its
 * end time by dragging up or down.
 *
 * How it works:
 *   1. User presses down on the resize handle (thin bar at bottom of event card)
 *   2. As the pointer moves vertically, the component calculates the new end time
 *      in 15-minute increments based on how far the cursor has moved relative to
 *      the time grid's pixel height
 *   3. On release (pointerup), the final end time is persisted to Google Calendar
 *   4. During the drag, the parent receives live height updates for visual feedback
 *
 * Design for iPazzPort touchpad:
 *   - The handle is 8px tall for easy targeting
 *   - Uses a south-resize cursor to clearly communicate the interaction
 *   - Pointer capture ensures the resize continues even if the cursor drifts
 *     outside the handle element during fast movements
 *
 * Props:
 *   @param {object} event - The event being resized (needs start, end, calendarId)
 *   @param {number} dayStartHour - First hour of the time grid (e.g., 7)
 *   @param {number} dayEndHour - Last hour of the time grid (e.g., 22)
 *   @param {number} gridHeight - The pixel height of the time grid container
 *   @param {function} onResize - Called during drag with (eventId, newEndISO) for live preview
 *   @param {function} onResizeEnd - Called on pointer release with (eventId, { calendarId, end }) to persist
 */

import React, { useCallback, useRef } from 'react';

/**
 * Snaps a minute value to the nearest 15-minute increment.
 * E.g., 37 → 30, 38 → 45, 7 → 0, 53 → 45
 *
 * @param {number} minutes - Total minutes since midnight
 * @returns {number} Minutes rounded to the nearest 15-minute boundary
 */
function snapTo15Minutes(minutes) {
  return Math.round(minutes / 15) * 15;
}

export default function ResizeHandle({ event, dayStartHour, dayEndHour, gridHeight, onResize, onResizeEnd }) {
  // Store the pointer's starting Y position when the resize begins
  const startYRef = useRef(0);

  // Store the event's original end time in minutes since midnight
  const originalEndMinutesRef = useRef(0);

  /**
   * Given a pixel delta from the start of the drag, computes a valid
   * clamped end-time in minutes since midnight. Enforces:
   *   - Minimum 15-minute duration (can't make event shorter than 15 min)
   *   - Maximum at the end of the grid (can't extend past dayEndHour)
   *   - Snapping to 15-minute boundaries
   *
   * @param {number} deltaY - Pixels moved from the initial pointer position
   * @returns {number} New end time in minutes since midnight
   */
  const computeEndMinutes = useCallback((deltaY) => {
    const totalGridMinutes = (dayEndHour - dayStartHour) * 60;

    // Guard against zero gridHeight (before first measurement or in tests)
    const minutesDelta = gridHeight > 0
      ? (deltaY / gridHeight) * totalGridMinutes
      : 0;

    const newEndMinutes = snapTo15Minutes(originalEndMinutesRef.current + minutesDelta);

    // Enforce minimum duration of 15 minutes
    const startDate = new Date(event.start);
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const clampedEnd = Math.max(newEndMinutes, startMinutes + 15);

    // Don't allow extending past the end of the grid
    const maxMinutes = dayEndHour * 60;
    return Math.min(clampedEnd, maxMinutes);
  }, [event.start, dayStartHour, dayEndHour, gridHeight]);

  /**
   * Builds an ISO date-time string for a given end time in minutes,
   * using the event's start date as the base date.
   *
   * @param {number} endMinutes - Minutes since midnight for the new end time
   * @returns {string} ISO date-time string
   */
  const buildEndISO = useCallback((endMinutes) => {
    const newEnd = new Date(event.start);
    newEnd.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
    return newEnd.toISOString();
  }, [event.start]);

  /**
   * Called when the user presses down on the resize handle.
   * Captures the pointer to receive all subsequent move/up events
   * even if the cursor leaves the handle element.
   */
  const handlePointerDown = useCallback((e) => {
    // Prevent the event from bubbling to the drag-and-drop system
    // (we don't want a resize to also trigger a day-to-day move)
    e.stopPropagation();
    e.preventDefault();

    // Capture the pointer so we keep receiving events during fast moves
    e.target.setPointerCapture(e.pointerId);

    // Record the starting Y coordinate and the event's current end time
    startYRef.current = e.clientY;
    const endDate = new Date(event.end);
    originalEndMinutesRef.current = endDate.getHours() * 60 + endDate.getMinutes();
  }, [event.end]);

  /**
   * Called as the pointer moves while the handle is pressed.
   * Provides live visual feedback by updating the preview end time.
   */
  const handlePointerMove = useCallback((e) => {
    // Only process if we're actively resizing (pointer is captured)
    if (!e.target.hasPointerCapture(e.pointerId)) return;

    const deltaY = e.clientY - startYRef.current;
    const endMinutes = computeEndMinutes(deltaY);
    onResize(event.id, buildEndISO(endMinutes));
  }, [event.id, computeEndMinutes, buildEndISO, onResize]);

  /**
   * Called when the pointer is released. Finalizes the resize by
   * persisting the new end time to Google Calendar.
   */
  const handlePointerUp = useCallback((e) => {
    // Release pointer capture
    if (e.target.hasPointerCapture(e.pointerId)) {
      e.target.releasePointerCapture(e.pointerId);
    }

    const deltaY = e.clientY - startYRef.current;
    const endMinutes = computeEndMinutes(deltaY);
    const newEndISO = buildEndISO(endMinutes);

    // Only persist if the time actually changed
    if (newEndISO !== event.end) {
      onResizeEnd(event.id, {
        calendarId: event.calendarId,
        end: newEndISO,
      });
    }
  }, [event, computeEndMinutes, buildEndISO, onResizeEnd]);

  return (
    <div
      style={styles.handle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      title="Drag to resize"
      aria-label={`Resize ${event.title}. Drag down to extend, up to shorten.`}
    >
      {/* Visual indicator — small horizontal line */}
      <div style={styles.indicator} />
    </div>
  );
}

/** Component styles */
const styles = {
  handle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '8px',
    cursor: 's-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    touchAction: 'none',
  },
  indicator: {
    width: '20px',
    height: '3px',
    borderRadius: '2px',
    background: 'rgba(0, 0, 0, 0.2)',
    transition: 'background 0.15s',
  },
};
