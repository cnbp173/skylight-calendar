/**
 * AddEventDialog Component
 *
 * A modal dialog for creating new appointments. Opened when the user
 * clicks the "Add New Appointment" button. Allows the user to:
 *   - Enter a title
 *   - Choose a date
 *   - Set start and end times
 *   - Add a description
 *   - Assign the event to one of the connected calendars
 *
 * The calendar selector shows all connected calendars with their color
 * indicators so the user can see which family member or category the
 * appointment will belong to.
 *
 * Input design considerations for iPazzPort mini keyboard + touchpad:
 *   - All inputs have generous sizing (min 44px height)
 *   - Tab order flows logically through the form fields
 *   - Escape key closes the dialog without saving
 *   - The title input is auto-focused on open
 *
 * Props:
 *   @param {Array} calendars - Available calendars to assign the event to
 *   @param {function} onCreate - Callback with (eventData) when user saves
 *   @param {function} onClose - Callback to close the dialog without saving
 */

import React, { useState, useEffect, useRef } from 'react';

export default function AddEventDialog({ calendars, onCreate, onClose }) {
  // Form state — initialized with sensible defaults
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [startTime, setStartTime] = useState(getNextHourString());
  const [endTime, setEndTime] = useState(getNextHourPlusOneString());
  const [description, setDescription] = useState('');
  const [calendarId, setCalendarId] = useState(calendars[0]?.id || '');

  // Track whether a save is in progress
  const [saving, setSaving] = useState(false);

  // Track save errors to show feedback
  const [error, setError] = useState(null);

  // Ref to the title input — auto-focused when the dialog opens
  const titleRef = useRef(null);

  /**
   * Auto-focus the title field when the dialog opens.
   */
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  /**
   * Handle Escape key to close the dialog.
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  /**
   * Handles form submission. Builds the event data object and calls onCreate.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Combine date and time fields into ISO datetime strings
    const newStart = new Date(`${date}T${startTime}:00`).toISOString();
    const newEnd = new Date(`${date}T${endTime}:00`).toISOString();

    const eventData = {
      calendarId,
      title,
      start: newStart,
      end: newEnd,
      description,
    };

    const success = await onCreate(eventData);
    setSaving(false);

    if (!success) {
      setError('Failed to create appointment. Please try again.');
    }
  };

  return (
    // Backdrop — clicking outside the dialog closes it
    <div style={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label="Add new appointment">
      {/* Dialog container */}
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.heading}>Add New Appointment</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Title field */}
          <label style={styles.label}>
            Title
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
              placeholder="Appointment title"
              required
            />
          </label>

          {/* Calendar selector — assign to a specific person/calendar */}
          <label style={styles.label}>
            Calendar
            <select
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              style={styles.input}
              required
            >
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.summary}
                </option>
              ))}
            </select>
          </label>

          {/* Date field */}
          <label style={styles.label}>
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={styles.input}
              required
            />
          </label>

          {/* Time fields — start and end in a row */}
          <div style={styles.timeRow}>
            <label style={{ ...styles.label, flex: 1 }}>
              Start Time
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={styles.input}
                required
              />
            </label>
            <label style={{ ...styles.label, flex: 1 }}>
              End Time
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={styles.input}
                required
              />
            </label>
          </div>

          {/* Description field */}
          <label style={styles.label}>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={styles.textarea}
              placeholder="Add a description..."
              rows={3}
            />
          </label>

          {/* Error message */}
          {error && (
            <p style={styles.error}>{error}</p>
          )}

          {/* Action buttons */}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.saveButton}
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Returns today's date as YYYY-MM-DD for the date input default.
 */
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the next full hour as HH:MM for the start time default.
 * E.g., if it's 2:35 PM, returns "15:00".
 */
function getNextHourString() {
  const d = new Date();
  const nextHour = d.getHours() + 1;
  return `${String(nextHour).padStart(2, '0')}:00`;
}

/**
 * Returns one hour after the next full hour for the end time default.
 * E.g., if it's 2:35 PM, returns "16:00".
 */
function getNextHourPlusOneString() {
  const d = new Date();
  const nextHour = d.getHours() + 2;
  return `${String(nextHour).padStart(2, '0')}:00`;
}

/**
 * Component styles — matches EditEventDialog for visual consistency.
 * All interactive elements are 44px+ for iPazzPort touchpad targeting.
 */
const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  dialog: {
    background: 'var(--bg-secondary)',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
  },
  heading: {
    fontSize: '22px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '12px 14px',
    fontSize: '15px',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    minHeight: '44px',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  textarea: {
    padding: '12px 14px',
    fontSize: '15px',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  timeRow: {
    display: 'flex',
    gap: '12px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  cancelButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid var(--border)',
    borderRadius: '8px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    minHeight: '44px',
  },
  saveButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    background: '#4285f4',
    color: '#ffffff',
    cursor: 'pointer',
    minHeight: '44px',
  },
  error: {
    fontSize: '13px',
    color: '#e53e3e',
    padding: '8px 12px',
    background: '#fff5f5',
    borderRadius: '6px',
  },
};
