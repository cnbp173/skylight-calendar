import React from 'react';

export default function EventCard({ event, color = '#64B5F6' }) {
  const time = event.allDay
    ? 'All day'
    : new Date(event.start).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

  return (
    <div style={{ ...styles.card, borderLeftColor: color }}>
      <span style={styles.time}>{time}</span>
      <span style={styles.title}>{event.title}</span>
      {event.location && (
        <span style={styles.location}>{event.location}</span>
      )}
    </div>
  );
}

const styles = {
  card: {
    padding: '8px 10px',
    borderLeft: '3px solid',
    borderRadius: '6px',
    background: 'rgba(0, 0, 0, 0.02)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  time: {
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  title: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  location: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
