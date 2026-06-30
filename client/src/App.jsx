/**
 * App — Root Component
 *
 * The top-level component that orchestrates the Skylight Calendar UI.
 * Handles authentication state, week navigation, and passes data/callbacks
 * down to child components.
 *
 * Layout (top to bottom):
 *   1. Header — shows week range, current time, navigation buttons, weather
 *   2. CalendarLegend + "Add New Appointment" button
 *   3. WeekView — the 7-day grid showing all events (with drag-and-drop)
 *
 * If the user hasn't connected Google Calendar yet, shows SetupScreen instead.
 */

import React, { useState, useEffect } from 'react';
import WeekView from './components/WeekView.jsx';
import WeatherWidget from './components/WeatherWidget.jsx';
import Header from './components/Header.jsx';
import CalendarLegend from './components/CalendarLegend.jsx';
import SetupScreen from './components/SetupScreen.jsx';
import EditEventDialog from './components/EditEventDialog.jsx';
import AddEventDialog from './components/AddEventDialog.jsx';
import { useCalendarData } from './hooks/useCalendarData.js';
import { useWeatherData } from './hooks/useWeatherData.js';

export default function App() {
  // null = still checking auth status, true/false = determined
  const [authenticated, setAuthenticated] = useState(null);

  // Which week to display: 0 = current, -1 = last, +1 = next, etc.
  const [weekOffset, setWeekOffset] = useState(0);

  // The event currently open in the edit dialog (null = dialog closed)
  const [editingEvent, setEditingEvent] = useState(null);

  // Whether the "Add New Appointment" dialog is open
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Core data hooks — calendars, events, and mutation functions
  const { calendars, events, loading, updateEvent, createEvent } = useCalendarData(authenticated, weekOffset);
  const { weather } = useWeatherData();

  /**
   * On mount, check if the user has already connected their Google account.
   * The server returns { authenticated: true/false } based on whether
   * tokens exist on disk.
   */
  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((data) => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  /**
   * Opens the edit dialog for a given event.
   * Called when the user double-clicks an event card.
   */
  const handleEditEvent = (event) => {
    setEditingEvent(event);
  };

  /**
   * Saves changes from the edit dialog.
   * Delegates to updateEvent which handles optimistic updates and server sync.
   */
  const handleSaveEvent = async (eventId, updates) => {
    const success = await updateEvent(eventId, updates);
    if (success) {
      setEditingEvent(null);
    }
    return success;
  };

  /**
   * Creates a new event from the add dialog.
   * Delegates to createEvent which posts to the server and adds to local state.
   */
  const handleCreateEvent = async (eventData) => {
    const success = await createEvent(eventData);
    if (success) {
      setShowAddDialog(false);
    }
    return success;
  };

  // Show nothing while checking auth (prevents flash of wrong screen)
  if (authenticated === null) return null;

  // Not authenticated — show the Google Calendar connection prompt
  if (!authenticated) return <SetupScreen />;

  return (
    <div style={styles.container}>
      {/* Top bar: navigation arrows, week label, time, and weather */}
      <Header
        weather={weather}
        weekOffset={weekOffset}
        onPrevWeek={() => setWeekOffset((w) => w - 1)}
        onNextWeek={() => setWeekOffset((w) => w + 1)}
        onToday={() => setWeekOffset(0)}
      />

      {/* Calendar legend and add button row */}
      <div style={styles.legendRow}>
        <CalendarLegend calendars={calendars} />
        <button
          style={styles.addButton}
          onClick={() => setShowAddDialog(true)}
          aria-label="Add new appointment"
        >
          + Add New Appointment
        </button>
      </div>

      {/* The main 7-day grid with draggable events */}
      <WeekView
        events={events}
        calendars={calendars}
        loading={loading}
        weekOffset={weekOffset}
        onEventUpdate={updateEvent}
        onEventEdit={handleEditEvent}
      />

      {/* Modal dialog for editing event details (opened by double-click) */}
      {editingEvent && (
        <EditEventDialog
          event={editingEvent}
          onSave={handleSaveEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {/* Modal dialog for creating new appointments */}
      {showAddDialog && (
        <AddEventDialog
          calendars={calendars}
          onCreate={handleCreateEvent}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}

/**
 * Root container styles.
 * Uses flexbox column layout to stack header, legend, and week view.
 * The padding provides breathing room on the TV display.
 */
const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 32px',
    gap: '16px',
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  addButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    background: '#4285f4',
    color: '#ffffff',
    cursor: 'pointer',
    minHeight: '44px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
};
