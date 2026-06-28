import React from 'react';

export default function SetupScreen() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Skylight Calendar</h1>
        <p style={styles.subtitle}>Connect your Google Calendar to get started</p>
        <a href="/api/auth/login" style={styles.button}>
          Connect Google Calendar
        </a>
        <p style={styles.hint}>
          After connecting, the calendar will automatically sync and display your events.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
  },
  card: {
    background: 'var(--bg-secondary)',
    borderRadius: '16px',
    padding: '48px',
    textAlign: 'center',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
    maxWidth: '480px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    marginBottom: '32px',
  },
  button: {
    display: 'inline-block',
    padding: '14px 32px',
    background: '#4285f4',
    color: '#ffffff',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'background 0.2s',
  },
  hint: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '24px',
    lineHeight: 1.5,
  },
};
