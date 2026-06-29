import React from 'react';

const WEATHER_ICONS = {
  Clear: '☀️',
  Clouds: '☁️',
  Rain: '🌧️',
  Drizzle: '🌦️',
  Thunderstorm: '⛈️',
  Snow: '❄️',
  Mist: '🌫️',
  Fog: '🌫️',
  Haze: '🌫️',
};

const NIGHT_ICONS = {
  Clear: '🌙',
};

const PERIOD_LABELS = [
  { key: 'morning', label: 'Morn' },
  { key: 'afternoon', label: 'Noon' },
  { key: 'evening', label: 'Eve' },
  { key: 'night', label: 'Night' },
];

function getIcon(condition, isNight = false) {
  if (isNight && NIGHT_ICONS[condition]) return NIGHT_ICONS[condition];
  return WEATHER_ICONS[condition] || '🌤️';
}

function getDayName(dateStr, index) {
  if (index === 0) return 'Today';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export default function WeatherWidget({ weather }) {
  if (!weather) return null;

  const { current, periods, daily } = weather;
  const currentIcon = getIcon(current.condition);

  return (
    <div style={styles.container}>
      <div style={styles.currentSection}>
        <span style={styles.currentIcon}>{currentIcon}</span>
        <div style={styles.currentInfo}>
          <span style={styles.currentTemp}>{current.temp}°</span>
          <span style={styles.currentDesc}>{current.description}</span>
        </div>
      </div>

      {periods && (
        <div style={styles.periodsSection}>
          {PERIOD_LABELS.map(({ key, label }) => {
            const p = periods[key];
            if (!p) return null;
            return (
              <div key={key} style={styles.periodItem}>
                <span style={styles.periodLabel}>{label}</span>
                <span style={styles.periodIcon}>{getIcon(p.condition, key === 'night')}</span>
                <span style={styles.periodTemp}>{p.temp}°</span>
              </div>
            );
          })}
        </div>
      )}

      {daily && daily.length > 0 && (
        <div style={styles.forecastSection}>
          {daily.map((day, i) => (
            <div key={day.date} style={styles.forecastDay}>
              <span style={styles.forecastDayName}>{getDayName(day.date, i)}</span>
              <span style={styles.forecastIcon}>{getIcon(day.condition)}</span>
              <span style={styles.forecastHigh}>{day.high}°</span>
              <span style={styles.forecastLow}>{day.low}°</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px 16px',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
  },
  currentSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingRight: '12px',
    borderRight: '1px solid var(--border)',
  },
  currentIcon: {
    fontSize: '28px',
  },
  currentInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  currentTemp: {
    fontSize: '22px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.1,
  },
  currentDesc: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    textTransform: 'capitalize',
  },
  periodsSection: {
    display: 'flex',
    gap: '10px',
    paddingRight: '12px',
    borderRight: '1px solid var(--border)',
  },
  periodItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1px',
  },
  periodLabel: {
    fontSize: '9px',
    fontWeight: 500,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  periodIcon: {
    fontSize: '14px',
  },
  periodTemp: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  forecastSection: {
    display: 'flex',
    gap: '8px',
  },
  forecastDay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1px',
    minWidth: '36px',
  },
  forecastDayName: {
    fontSize: '9px',
    fontWeight: 500,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  forecastIcon: {
    fontSize: '14px',
  },
  forecastHigh: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  forecastLow: {
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
};
