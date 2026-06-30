/**
 * EditEventDialog Component
 *
 * A modal dialog for editing event details. Opened when the user
 * double-clicks an event card. Allows modification of:
 *   - Title (event name/summary)
 *   - Date (can be changed to any date, not limited to current week)
 *   - Start time
 *   - End time
 *   - Description
 *
 * This is the mechanism for rescheduling events to dates outside the
 * currently visible week — drag-and-drop only works within the week,
 * but this dialog allows arbitrary date changes.
 *
 * Input design considerations for iPazzPort mini keyboard + touchpad:
 *   - All inputs have generous sizing (min 44px height) for touchpad targeting
 *   - Tab order flows logically through the form fields
 *   - Escape key closes the dialog without saving
 *   - Enter key in any field submits the form
 *   - The Save/Cancel buttons are large enough to hit with the touchpad
 *
 * Props:
 *   @param {object} event - The event being edited (pre-populates the form)
 *   @param {function} onSave - Callback with (eventId, updates) when user saves
 *   @param {function} onClose - Callback to close the dialog without saving
 */

import React, { useState, useEffect, useRef } from 'react';

export default function EditEventDialog({ event, onSave, onClose }) {
  // Form state — initialized from the event being edited
  const [title, setTitle] = useState(event.title || '');
  const [date, setDate] = useState(formatDateForInput(event.start));
  const [startTime, setStartTime] = useState(formatTimeForInput(event.start));
  const [endTime, setEndTime] = useState(formatTimeForInput(event.end));
  const [description, setDescription] = useState(event.description || '');

  // Track whether a save is in progress (disables the button, shows feedback)
  const [saving, setSaving] = useState(false);

  // Track save errors to show feedback to the user
  const [error, setError] = useState(null);

  // Ref to the title input — auto-focused when the dialog opens
  const titleRef = useRef(null);

  /**
   * When the start time changes, auto-set end time to 30 minutes later.
   * This ensures the user always has a valid duration by default.
   */
  const handleStartTimeChange = (newStartTime) => {
    setStartTime(newStartTime);
    setEndTime(addMinutesToTime(newStartTime, 30));
  };

  /**
   * When the end time changes, enforce that it cannot be before the start time.
   * If the user picks an end time earlier than start, snap it to start + 30 min.
   */
  const handleEndTimeChange = (newEndTime) => {
    if (newEndTime <= startTime) {
      setEndTime(addMinutesToTime(startTime, 30));
    } else {
      setEndTime(newEndTime);
    }
  };

  /**
   * Auto-focus the title field when the dialog opens.
   * This ensures the user can immediately start typing with the
   * iPazzPort keyboard without needing to click/tap first.
   */
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, []);

  /**
   * Handle keyboard events on the dialog backdrop.
   * Escape closes the dialog (standard modal behavior).
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
   * Handles form submission. Builds an ISO date-time string from the
   * separate date and time inputs, then calls onSave with the updates.
   *
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Combine the date and time fields into full ISO datetime strings
    const newStart = new Date(`${date}T${startTime}:00`).toISOString();
    const newEnd = new Date(`${date}T${endTime}:00`).toISOString();

    // Build the update payload
    const updates = {
      calendarId: event.calendarId,
      title,
      start: newStart,
      end: newEnd,
      description,
    };

    const success = await onSave(event.id, updates);
    setSaving(false);

    if (!success) {
      setError('Failed to save changes. Please try again.');
    }
  };

  return (
    // Backdrop — clicking outside the dialog closes it
    <div style={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label="Edit event">
      {/* Dialog container — stopPropagation prevents backdrop click from firing */}
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Dialog header */}
        <h2 style={styles.heading}>Edit Event</h2>

        {/* Form with all editable fields */}
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
              placeholder="Event title"
              required
            />
          </label>

          {/* Date field — allows selecting any date (not limited to current week) */}
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
                onChange={(e) => handleStartTimeChange(e.target.value)}
                style={styles.input}
                required
              />
            </label>
            <label style={{ ...styles.label, flex: 1 }}>
              End Time
              <input
                type="time"
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                style={styles.input}
                required
              />
            </label>
          </div>

          {/* Description field — multiline textarea */}
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

          {/* Error message (shown if save fails) */}
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
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Extracts the date portion from an ISO string or date string
 * and formats it as YYYY-MM-DD for the date input field.
 *
 * @param {string} dateStr - ISO date or date-time string
 * @returns {string} Date in YYYY-MM-DD format
 */
function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  // Use local date parts to avoid timezone offset issues
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extracts the time portion from an ISO string and formats it
 * as HH:MM for the time input field.
 *
 * @param {string} dateStr - ISO date-time string
 * @returns {string} Time in HH:MM format
 */
function formatTimeForInput(dateStr) {
  if (!dateStr) return '00:00';
  const d = new Date(dateStr);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Adds a given number of minutes to a time string (HH:MM format).
 * Caps at 23:59 to prevent overflow into the next day.
 *
 * @param {string} time - Time in HH:MM format
 * @param {number} minutes - Minutes to add
 * @returns {string} New time in HH:MM format
 */
function addMinutesToTime(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Component styles.
 * All interactive elements are sized at minimum 44px height for comfortable
 * touchpad targeting with the iPazzPort mini keyboard's built-in touchpad.
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
