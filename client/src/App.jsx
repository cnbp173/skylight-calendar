import React, { useState, useEffect } from 'react';
import WeekView from './components/WeekView.jsx';
import WeatherWidget from './components/WeatherWidget.jsx';
import Header from './components/Header.jsx';
import SetupScreen from './components/SetupScreen.jsx';
import { useCalendarData } from './hooks/useCalendarData.js';
import { useWeatherData } from './hooks/useWeatherData.js';

export default function App() {
  const [authenticated, setAuthenticated] = useState(null);
  const { calendars, events, loading } = useCalendarData(authenticated);
  const { weather } = useWeatherData();

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((data) => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) return null;
  if (!authenticated) return <SetupScreen />;

  return (
    <div style={styles.container}>
      <Header weather={weather} />
      <WeekView events={events} calendars={calendars} loading={loading} />
    </div>
  );
}

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 32px',
    gap: '16px',
  },
};
