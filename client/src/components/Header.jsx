/**
 * Header Component
 *
 * The top bar of the calendar display showing:
 *   - Week navigation buttons (previous/next week, today)
 *   - The date range label for the current week (e.g., "June 28 – July 4, 2026")
 *   - The current time (updates every minute)
 *   - The weather widget
 *
 * Navigation buttons are sized at 36px minimum for comfortable touchpad targeting
 * with the iPazzPort mini keyboard's built-in touchpad.
 *
 * Props:
 *   @param {object} weather - Weather data for the WeatherWidget
 *   @param {number} weekOffset - Current week offset (0 = this week)
 *   @param {function} onPrevWeek - Navigate to previous week
 *   @param {function} onNextWeek - Navigate to next week
 *   @param {function} onToday - Jump back to the current week
 */

import React, { useState, useEffect } from 'react';
import WeatherWidget from './WeatherWidget.jsx';

export default function Header({ weather, weekOffset, onPrevWeek, onNextWeek, onToday }) {
  // Current time — updates every minute to keep the clock display accurate
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate the display date based on the week offset
  const displayDate = new Date(now);
  displayDate.setDate(displayDate.getDate() + weekOffset * 7);

  // Compute the start (Sunday) and end (Saturday) of the displayed week
  const weekStart = new Date(displayDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Format as a human-readable range like "June 28 – July 4, 2026"
  const weekLabel = formatWeekRange(weekStart, weekEnd);

  // Format the current time (e.g., "2:30 PM")
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div style={styles.header}>
      <div style={styles.left}>
        {/* Week navigation controls */}
        <div style={styles.nav}>
          <button style={styles.navButton} onClick={onPrevWeek} aria-label="Previous week">
            ‹
          </button>
          {/* "Today" button only appears when not viewing the current week */}
          {weekOffset !== 0 && (
            <button style={styles.todayButton} onClick={onToday}>
              Today
            </button>
          )}
          <button style={styles.navButton} onClick={onNextWeek} aria-label="Next week">
            ›
          </button>
        </div>

        {/* Week date range label */}
        <h1 style={styles.date}>{weekLabel}</h1>

        {/* Current clock time */}
        <span style={styles.time}>{timeStr}</span>
      </div>

      {/* Weather display on the right side of the header */}
      <WeatherWidget weather={weather} />
    </div>
  );
}

/**
 * Formats a start–end date range into a readable string.
 * Handles the case where the week spans two different months.
 *
 * Examples:
 *   - Same month: "June 1 – 7, 2026"
 *   - Spanning months: "June 28 – July 4, 2026"
 *
 * @param {Date} start - The first day of the week (Sunday)
 * @param {Date} end - The last day of the week (Saturday)
 * @returns {string} Formatted date range string
 */
function formatWeekRange(start, end) {
  const startMonth = start.toLocaleDateString('en-US', { month: 'long' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'long' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

/** Component styles */
const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  navButton: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    width: '36px',
    height: '36px',
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  date: {
    fontSize: '28px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  time: {
    fontSize: '20px',
    fontWeight: 400,
    color: 'var(--text-secondary)',
  },
};
