/**
 * EditEventDialog Component — Unit Tests
 *
 * Tests the event editing modal's behavior:
 *   - Form is pre-populated with event data
 *   - Title input is auto-focused on open
 *   - Escape key closes the dialog
 *   - Clicking the backdrop closes the dialog
 *   - Form submission calls onSave with correct data
 *   - Cancel button closes without saving
 *   - Error messages display on save failure
 *   - Save button is disabled while saving
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditEventDialog from '../components/EditEventDialog.jsx';

// Sample event used across tests
const mockEvent = {
  id: 'evt-123',
  calendarId: 'cal1',
  title: 'Team Meeting',
  start: '2026-06-28T14:00:00.000Z',
  end: '2026-06-28T15:00:00.000Z',
  description: 'Weekly sync with the team',
  allDay: false,
};

describe('EditEventDialog', () => {
  let onSave;
  let onClose;

  beforeEach(() => {
    onSave = vi.fn().mockResolvedValue(true);
    onClose = vi.fn();
  });

  it('renders with the event title pre-populated', () => {
    render(<EditEventDialog event={mockEvent} onSave={onSave} onClose={onClose} />);

    const titleInput = screen.getByDisplayValue('Team Meeting');
    expect(titleInput).toBeInTheDocument();
  });

  it('renders with the description pre-populated', () => {
    render(<EditEventDialog event={mockEvent} onSave={onSave} onClose={onClose} />);

    const descInput = screen.getByDisplayValue('Weekly sync with the team');
    expect(descInput).toBeInTheDocument();
  });

  it('auto-focuses the title input on mount', () => {
    render(<EditEventDialog event={mockEvent} onSave={onSave} onClose={onClose} />);

    const titleInput = screen.getByDisplayValue('Team Meeting');
    expect(document.activeElement).toBe(titleInput);
  });

  it('closes when Escape key is pressed', () => {
    render(<EditEventDialog event={mockEvent} onSave={onSave} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking the backdrop', () => {
    render(<EditEventDialog event={mockEvent} onSave={onSave} onClose={onClose} />);

    // The backdrop is the outermost div with role="dialog"
    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the dialog', () => {
    render(<EditEventDialog event={mockEvent} onSave={onSave} onClose={onClose} />);

    // Click the heading inside the dialog
    fireEvent.click(screen.getByText('Edit Event'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(<EditEventDialog event={mockEvent} onSave={onSave} onClose={onClose} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with updated data on form submission', async () => {
    render(<EditEventDialog event={mockEvent} onSave={onSave} onClose={onClose} />);

    // Change the title
    const titleInput = screen.getByDisplayValue('Team Meeting');
    fireEvent.change(titleInput, { target: { value: 'Renamed Meeting' } });

    // Submit the form
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    // Verify onSave was called with the event ID and updates
    const [eventId, updates] = onSave.mock.calls[0];
    expect(eventId).toBe('evt-123');
    expect(updates.title).toBe('Renamed Meeting');
    expect(updates.calendarId).toBe('cal1');
  });

  it('shows error message when save fails', async () => {
    onSave.mockResolvedValue(false);
    render(<EditEventDialog event={mockEvent} onSave={onSave} onClose={onClose} />);

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(screen.getByText('Failed to save changes. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables save button while saving', async () => {
    // Make onSave take a while to resolve
    onSave.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 100)));
    render(<EditEventDialog event={mockEvent} onSave={onSave} onClose={onClose} />);

    fireEvent.click(screen.getByText('Save Changes'));

    // Button should show "Saving..." and be disabled
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByText('Saving...')).toBeDisabled();
  });

  it('handles events with no description', () => {
    const eventNoDesc = { ...mockEvent, description: null };
    render(<EditEventDialog event={eventNoDesc} onSave={onSave} onClose={onClose} />);

    // Should render with empty description, not "null"
    const textarea = screen.getByPlaceholderText('Add a description...');
    expect(textarea.value).toBe('');
  });

  it('auto-sets end time to 30 minutes after start when start time changes', () => {
    render(<EditEventDialog event={mockEvent} onSave={onSave} onClose={onClose} />);

    const startInput = screen.getAllByDisplayValue(/:/)[0];
    fireEvent.change(startInput, { target: { value: '10:00' } });

    // End time should automatically become 10:30
    const endInput = screen.getAllByRole('textbox').length; // fallback: check by value
    expect(screen.getByDisplayValue('10:30')).toBeInTheDocument();
  });

  it('prevents end time from being before start time', () => {
    render(<EditEventDialog event={mockEvent} onSave={onSave} onClose={onClose} />);

    // First set start to 14:00 (end becomes 14:30)
    const inputs = document.querySelectorAll('input[type="time"]');
    const startInput = inputs[0];
    const endInput = inputs[1];

    fireEvent.change(startInput, { target: { value: '14:00' } });
    // Try to set end time before start
    fireEvent.change(endInput, { target: { value: '13:00' } });

    // End should snap to start + 30 min = 14:30
    expect(endInput.value).toBe('14:30');
  });
});
