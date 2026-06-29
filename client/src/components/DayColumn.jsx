import React from 'react';
import EventCard from './EventCard.jsx';

export default function DayColumn({ date, events, isToday, colorMap, dayStartHour, dayEndHour }) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = date.getDate();

  const totalHours = dayEndHour - dayStartHour;
  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);

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
      {allDayEvents.length > 0 && (
        <div style={styles.allDay}>
          {allDayEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              color={colorMap[event.calendarId]}
              compact
            />
          ))}
        </div>
      )}
      <div style={styles.timeGrid}>
        {Array.from({ length: totalHours }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${(i / totalHours) * 100}%`,
              left: 0,
              right: 0,
              borderTop: '1px solid var(--border)',
            }}
          />
        ))}
        {timedEvents.map((event) => {
          const startDate = new Date(event.start);
          const endDate = new Date(event.end);
          const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
          const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

          const gridStartMinutes = dayStartHour * 60;
          const gridEndMinutes = dayEndHour * 60;
          const gridTotalMinutes = gridEndMinutes - gridStartMinutes;

          const topPct = Math.max(0, (startMinutes - gridStartMinutes) / gridTotalMinutes) * 100;
          const durationMinutes = Math.max(endMinutes - startMinutes, 20);
          const heightPct = Math.min(
            (durationMinutes / gridTotalMinutes) * 100,
            100 - topPct
          );

          return (
            <div
              key={event.id}
              style={{
                position: 'absolute',
                top: `${topPct}%`,
                height: `${heightPct}%`,
                left: '2px',
                right: '2px',
                minHeight: '18px',
              }}
            >
              <EventCard
                event={event}
                color={colorMap[event.calendarId]}
                compact={heightPct < 8}
              />
            </div>
          );
        })}
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
    padding: '8px 4px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    height: '48px',
    justifyContent: 'center',
  },
  dayName: {
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  dayNum: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  todayText: {
    color: '#d69e2e',
    fontWeight: 600,
  },
  todayNum: {
    color: '#d69e2e',
  },
  allDay: {
    padding: '4px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flexShrink: 0,
  },
  timeGrid: {
    position: 'relative',
    flex: 1,
    overflow: 'hidden',
  },
};
