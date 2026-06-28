import React from 'react';
import EventCard from './EventCard.jsx';

export default function DayColumn({ date, events, isToday, colorMap }) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = date.getDate();

  return (
    <div style={{ ...styles.column, ...(isToday ? styles.today : {}) }}>
      <div style={styles.header}>
        <span style={{ ...styles.dayName, ...(isToday ? styles.todayText : {}) }}>
          {dayName}
        </span>
        <span style={{ ...styles.dayNum, ...(isToday ? styles.todayNum : {}) }}>
          {dayNum}
        </span>
      </div>
      <div style={styles.events}>
        {events.length === 0 && (
          <span style={styles.empty}>No events</span>
        )}
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            color={colorMap[event.calendarId]}
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  column: {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius)',
    padding: '12px',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
  },
  today: {
    background: 'var(--today-highlight)',
    boxShadow: '0 0 0 2px #f6c944, var(--shadow)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border)',
  },
  dayName: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  dayNum: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginTop: '2px',
  },
  todayText: {
    color: '#d69e2e',
    fontWeight: 600,
  },
  todayNum: {
    color: '#d69e2e',
  },
  events: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    overflowY: 'auto',
  },
  empty: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    marginTop: '8px',
  },
};
