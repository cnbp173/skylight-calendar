import React from 'react';
import DayColumn from './DayColumn.jsx';

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 22;

export default function WeekView({ events, calendars, loading, weekOffset = 0 }) {
  const days = getWeekDays(weekOffset);
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

  const hours = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
    hours.push(h);
  }

  return (
    <div style={styles.container}>
      <div style={styles.timeGutter}>
        <div style={styles.gutterHeader} />
        <div style={styles.gutterBody}>
          {hours.map((h) => (
            <div key={h} style={styles.gutterHour}>
              <span style={styles.gutterLabel}>
                {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={styles.grid}>
        {days.map((day) => (
          <DayColumn
            key={day.toISOString()}
            date={day}
            events={eventsByDay[day.toDateString()] || []}
            isToday={day.toDateString() === today}
            colorMap={calendarColorMap}
            dayStartHour={DAY_START_HOUR}
            dayEndHour={DAY_END_HOUR}
          />
        ))}
      </div>
    </div>
  );
}

function getWeekDays(weekOffset = 0) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - start.getDay() + weekOffset * 7);
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
  container: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  timeGutter: {
    display: 'flex',
    flexDirection: 'column',
    width: '52px',
    flexShrink: 0,
  },
  gutterHeader: {
    height: '48px',
    flexShrink: 0,
  },
  gutterBody: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  gutterHour: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingRight: '8px',
  },
  gutterLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    transform: 'translateY(-6px)',
    whiteSpace: 'nowrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    flex: 1,
    minWidth: 0,
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
