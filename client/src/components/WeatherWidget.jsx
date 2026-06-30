/**
 * WeatherWidget Component
 *
 * Displays weather information in the header area, organized into three sections:
 *   1. Current conditions — large icon and temperature with description
 *   2. Today's periods — morning/afternoon/evening/night mini forecast
 *   3. Daily forecast — 7-day outlook with high/low temperatures
 *
 * Weather icons are emoji-based (no external icon library needed), chosen
 * based on the condition string from the OpenWeatherMap API.
 *
 * Returns null if no weather data is available (loading or API error).
 *
 * Props:
 *   @param {object} weather - Weather data with { current, periods, daily } structure
 */

import React from 'react';

/**
 * Maps OpenWeatherMap condition names to emoji icons for daytime display.
 */
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

/**
 * Night-specific icon overrides (only Clear has a distinct night variant).
 */
const NIGHT_ICONS = {
  Clear: '🌙',
};

/**
 * Display labels and keys for today's period breakdown.
 * The key maps to the period object in the weather data,
 * the label is what's shown in the UI.
 */
const PERIOD_LABELS = [
  { key: 'morning', label: 'Morn' },
  { key: 'afternoon', label: 'Noon' },
  { key: 'evening', label: 'Eve' },
  { key: 'night', label: 'Night' },
];

/**
 * Returns the appropriate weather emoji for a given condition.
 * Uses night variants when applicable (only for the "night" period).
 *
 * @param {string} condition - The weather condition (e.g., "Clear", "Rain")
 * @param {boolean} isNight - Whether to use night-specific icons
 * @returns {string} Emoji character
 */
function getIcon(condition, isNight = false) {
  if (isNight && NIGHT_ICONS[condition]) return NIGHT_ICONS[condition];
  return WEATHER_ICONS[condition] || '🌤️';
}

/**
 * Formats day names for the 7-day forecast.
 * The first day is always "Today", subsequent days show abbreviated names.
 *
 * @param {string} dateStr - ISO date string
 * @param {number} index - Day index in the forecast array (0 = today)
 * @returns {string} Display label (e.g., "Today", "Mon", "Tue")
 */
function getDayName(dateStr, index) {
  if (index === 0) return 'Today';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export default function WeatherWidget({ weather }) {
  // Don't render if weather data hasn't loaded yet
  if (!weather) return null;

  const { current, periods, daily } = weather;
  const currentIcon = getIcon(current.condition);

  return (
    <div style={styles.container}>
      {/* Current conditions section — prominent display */}
      <div style={styles.currentSection}>
        <span style={styles.currentIcon}>{currentIcon}</span>
        <div style={styles.currentInfo}>
          <span style={styles.currentTemp}>{current.temp}°</span>
          <span style={styles.currentDesc}>{current.description}</span>
        </div>
      </div>

      {/* Today's period breakdown (morning through night) */}
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

      {/* 7-day daily forecast */}
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

/** Component styles */
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
