/**
 * EventCard Component
 *
 * Renders a single calendar event as a styled card. The card displays
 * the event time, title, and optionally the location. The left border
 * color indicates which calendar the event belongs to.
 *
 * Two display modes:
 *   - Normal: Shows time, title, and location (for events with enough vertical space)
 *   - Compact: Shows only the title in a single line (for short-duration events
 *     or when used as the drag overlay)
 *
 * Props:
 *   @param {object} event - The event data (title, start, end, allDay, location)
 *   @param {string} color - Hex color for the left border (from calendar color map)
 *   @param {boolean} compact - Whether to render in compact (single-line) mode
 *   @param {boolean} isDragOverlay - Whether this card is the floating drag preview
 */

import React from 'react';

export default function EventCard({ event, color = '#64B5F6', compact = false, isDragOverlay = false }) {
  // Format the event time for display
  const time = event.allDay
    ? 'All day'
    : new Date(event.start).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

  // Extra styles applied when this is the floating drag overlay
  const overlayStyle = isDragOverlay ? {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transform: 'scale(1.02)',
    width: '120px',
  } : {};

  // Compact mode — used for short events or all-day events
  if (compact) {
    return (
      <div style={{
        ...styles.cardCompact,
        borderLeftColor: color,
        background: hexToRgba(color, 0.1),
        ...overlayStyle,
      }}>
        <span style={styles.titleCompact}>{event.title}</span>
      </div>
    );
  }

  // Normal mode — shows time, title, and optional location
  return (
    <div style={{
      ...styles.card,
      borderLeftColor: color,
      background: hexToRgba(color, 0.08),
      ...overlayStyle,
    }}>
      <span style={styles.time}>{time}</span>
      <span style={styles.title}>{event.title}</span>
      {event.location && (
        <span style={styles.location}>{event.location}</span>
      )}
    </div>
  );
}

/**
 * Converts a hex color string to an rgba() string with the given alpha.
 * Used to create semi-transparent background tints from calendar colors.
 *
 * @param {string} hex - Color in #RRGGBB format
 * @param {number} alpha - Opacity value between 0 and 1
 * @returns {string} CSS rgba() color string
 */
function hexToRgba(hex, alpha) {
  // Fallback for invalid or missing hex colors
  if (!hex || !hex.startsWith('#')) return `rgba(100, 181, 246, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Component styles */
const styles = {
  card: {
    padding: '4px 6px',
    borderLeft: '3px solid',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    height: '100%',
    overflow: 'hidden',
  },
  cardCompact: {
    padding: '2px 6px',
    borderLeft: '3px solid',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    overflow: 'hidden',
  },
  time: {
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    lineHeight: 1.2,
  },
  title: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  titleCompact: {
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  location: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
