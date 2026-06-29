import React from 'react';

export default function CalendarLegend({ calendars }) {
  if (!calendars || calendars.length === 0) return null;

  return (
    <div style={styles.container}>
      {calendars.map((cal) => (
        <div key={cal.id} style={styles.item}>
          <span style={{ ...styles.dot, backgroundColor: cal.color }} />
          <span style={styles.label}>{cal.summary}</span>
        </div>
      ))}
    </div>
  );
}

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
