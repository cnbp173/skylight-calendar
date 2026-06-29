import React, { useState, useEffect } from 'react';
import WeatherWidget from './WeatherWidget.jsx';

export default function Header({ weather, weekOffset, onPrevWeek, onNextWeek, onToday }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const displayDate = new Date(now);
  displayDate.setDate(displayDate.getDate() + weekOffset * 7);

  const weekStart = new Date(displayDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekLabel = formatWeekRange(weekStart, weekEnd);

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div style={styles.header}>
      <div style={styles.left}>
        <div style={styles.nav}>
          <button style={styles.navButton} onClick={onPrevWeek} aria-label="Previous week">
            ‹
          </button>
          {weekOffset !== 0 && (
            <button style={styles.todayButton} onClick={onToday}>
              Today
            </button>
          )}
          <button style={styles.navButton} onClick={onNextWeek} aria-label="Next week">
            ›
          </button>
        </div>
        <h1 style={styles.date}>{weekLabel}</h1>
        <span style={styles.time}>{timeStr}</span>
      </div>
      <WeatherWidget weather={weather} />
    </div>
  );
}

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
