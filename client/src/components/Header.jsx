import React, { useState, useEffect } from 'react';
import WeatherWidget from './WeatherWidget.jsx';

export default function Header({ weather }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div style={styles.header}>
      <div style={styles.left}>
        <h1 style={styles.date}>{dateStr}</h1>
        <span style={styles.time}>{timeStr}</span>
      </div>
      <WeatherWidget weather={weather} />
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '16px',
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
