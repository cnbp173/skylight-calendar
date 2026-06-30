/**
 * CalendarLegend Component
 *
 * Displays a horizontal row of colored indicators showing which calendars
 * are connected. Each indicator has a colored pill/dot and the calendar name.
 * This helps users understand which color corresponds to which calendar
 * (e.g., "Work" = blue, "Family" = green).
 *
 * Returns null if no calendars are available (graceful empty state).
 *
 * Props:
 *   @param {Array} calendars - Array of { id, summary, color, primary } objects
 */

import React from 'react';

export default function CalendarLegend({ calendars }) {
  // Don't render anything if there are no calendars to show
  if (!calendars || calendars.length === 0) return null;

  return (
    <div style={styles.container}>
      {calendars.map((cal) => (
        <div key={cal.id} style={styles.item}>
          {/* Colored pill indicator — matches the event card border colors */}
          <span style={{ ...styles.dot, backgroundColor: cal.color }} />
          {/* Calendar name (e.g., "Work", "Sarah", "Kids") */}
          <span style={styles.label}>{cal.summary}</span>
        </div>
      ))}
    </div>
  );
}

/** Component styles */
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dot: {
    width: '28px',
    height: '14px',
    borderRadius: '7px',
    flexShrink: 0,
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
};
