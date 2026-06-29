import React from 'react';

export default function EventCard({ event, color = '#64B5F6', compact = false }) {
  const time = event.allDay
    ? 'All day'
    : new Date(event.start).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

  if (compact) {
    return (
      <div style={{ ...styles.cardCompact, borderLeftColor: color, background: hexToRgba(color, 0.1) }}>
        <span style={styles.titleCompact}>{event.title}</span>
      </div>
    );
  }

  return (
    <div style={{ ...styles.card, borderLeftColor: color, background: hexToRgba(color, 0.08) }}>
      <span style={styles.time}>{time}</span>
      <span style={styles.title}>{event.title}</span>
      {event.location && (
        <span style={styles.location}>{event.location}</span>
      )}
    </div>
  );
}

function hexToRgba(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return `rgba(100, 181, 246, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
