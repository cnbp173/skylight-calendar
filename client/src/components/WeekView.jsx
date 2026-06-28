import React from 'react';
import DayColumn from './DayColumn.jsx';

export default function WeekView({ events, calendars, loading }) {
  const days = getWeekDays();
  const today = new Date().toDateString();

  const calendarColorMap = {};
  calendars.forEach((cal) => {
    calendarColorMap[cal.id] = cal.color;
  });

  const eventsByDay = groupEventsByDay(events, days);

  if (loading) {
    return (
      <div style={styles.loading}>
        <p style={styles.loadingText}>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div style={styles.grid}>
      {days.map((day) => (
        <DayColumn
          key={day.toISOString()}
          date={day}
          events={eventsByDay[day.toDateString()] || []}
          isToday={day.toDateString() === today}
          colorMap={calendarColorMap}
        />
      ))}
    </div>
  );
}

function getWeekDays() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

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

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
    flex: 1,
    minHeight: 0,
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
