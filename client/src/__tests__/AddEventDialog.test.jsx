/**
 * AddEventDialog Component — Unit Tests
 *
 * Tests the event creation modal's behavior:
 *   - Renders with the heading "Add New Appointment"
 *   - Title input is auto-focused on open
 *   - Escape key closes the dialog
 *   - Clicking the backdrop closes the dialog
 *   - Cancel button calls onClose
 *   - Form submission calls onCreate with correct data structure
 *   - Error messages display on creation failure
 *   - Submit button is disabled while saving
 *   - Calendar selector shows all provided calendars
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddEventDialog from '../components/AddEventDialog.jsx';

const mockCalendars = [
  { id: 'cal1', summary: 'Work', color: '#4285f4', primary: true },
  { id: 'cal2', summary: 'Family', color: '#33b679', primary: false },
];

describe('AddEventDialog', () => {
  let onCreate;
  let onClose;

  beforeEach(() => {
    onCreate = vi.fn().mockResolvedValue(true);
    onClose = vi.fn();
  });

  it('renders with the heading "Add New Appointment"', () => {
    render(<AddEventDialog calendars={mockCalendars} onCreate={onCreate} onClose={onClose} />);

    expect(screen.getByText('Add New Appointment')).toBeInTheDocument();
  });

  it('auto-focuses the title input on mount', () => {
    render(<AddEventDialog calendars={mockCalendars} onCreate={onCreate} onClose={onClose} />);

    const titleInput = screen.getByPlaceholderText('Appointment title');
    expect(document.activeElement).toBe(titleInput);
  });

  it('closes when Escape key is pressed', () => {
    render(<AddEventDialog calendars={mockCalendars} onCreate={onCreate} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking the backdrop', () => {
    render(<AddEventDialog calendars={mockCalendars} onCreate={onCreate} onClose={onClose} />);

    // The backdrop is the outermost div with role="dialog"
    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(<AddEventDialog calendars={mockCalendars} onCreate={onCreate} onClose={onClose} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onCreate with the correct data structure on form submission', async () => {
    render(<AddEventDialog calendars={mockCalendars} onCreate={onCreate} onClose={onClose} />);

    // Fill in the title
    const titleInput = screen.getByPlaceholderText('Appointment title');
    fireEvent.change(titleInput, { target: { value: 'Doctor Visit' } });

    // Select a calendar
    const calendarSelect = screen.getByRole('combobox');
    fireEvent.change(calendarSelect, { target: { value: 'cal2' } });

    // Fill in the description
    const descInput = screen.getByPlaceholderText('Add a description...');
    fireEvent.change(descInput, { target: { value: 'Annual checkup' } });

    // Submit the form
    fireEvent.click(screen.getByText('Create Appointment'));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledTimes(1);
    });

    const eventData = onCreate.mock.calls[0][0];
    expect(eventData).toHaveProperty('calendarId', 'cal2');
    expect(eventData).toHaveProperty('title', 'Doctor Visit');
    expect(eventData).toHaveProperty('start');
    expect(eventData).toHaveProperty('end');
    expect(eventData).toHaveProperty('description', 'Annual checkup');
  });

  it('shows error message when onCreate returns false', async () => {
    onCreate.mockResolvedValue(false);
    render(<AddEventDialog calendars={mockCalendars} onCreate={onCreate} onClose={onClose} />);

    // Fill in required title
    const titleInput = screen.getByPlaceholderText('Appointment title');
    fireEvent.change(titleInput, { target: { value: 'Test Event' } });

    fireEvent.click(screen.getByText('Create Appointment'));

    await waitFor(() => {
      expect(screen.getByText('Failed to create appointment. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables submit button while saving (shows "Creating...")', async () => {
    // Make onCreate take a while to resolve
    onCreate.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 100)));
    render(<AddEventDialog calendars={mockCalendars} onCreate={onCreate} onClose={onClose} />);

    // Fill in required title
    const titleInput = screen.getByPlaceholderText('Appointment title');
    fireEvent.change(titleInput, { target: { value: 'Test Event' } });

    fireEvent.click(screen.getByText('Create Appointment'));

    // Button should show "Creating..." and be disabled
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByText('Creating...')).toBeDisabled();
  });

  it('calendar selector shows all provided calendars', () => {
    render(<AddEventDialog calendars={mockCalendars} onCreate={onCreate} onClose={onClose} />);

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Work');
    expect(options[1]).toHaveTextContent('Family');
  });

  it('auto-sets end time to 30 minutes after start when start time changes', () => {
    render(<AddEventDialog calendars={mockCalendars} onCreate={onCreate} onClose={onClose} />);

    const inputs = document.querySelectorAll('input[type="time"]');
    const startInput = inputs[0];

    fireEvent.change(startInput, { target: { value: '09:00' } });

    // End time should automatically become 09:30
    expect(screen.getByDisplayValue('09:30')).toBeInTheDocument();
  });

  it('prevents end time from being before start time', () => {
    render(<AddEventDialog calendars={mockCalendars} onCreate={onCreate} onClose={onClose} />);

    const inputs = document.querySelectorAll('input[type="time"]');
    const startInput = inputs[0];
    const endInput = inputs[1];

    // Set start to 15:00 (end becomes 15:30)
    fireEvent.change(startInput, { target: { value: '15:00' } });
    // Try to set end before start
    fireEvent.change(endInput, { target: { value: '14:00' } });

    // Should snap to start + 30 = 15:30
    expect(endInput.value).toBe('15:30');
  });
});
