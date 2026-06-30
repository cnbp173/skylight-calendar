/**
 * DraggableEvent Component — Unit Tests
 *
 * Tests the drag-and-drop wrapper behavior:
 *   - Renders children correctly
 *   - Has accessible attributes (role, aria-label, tabIndex)
 *   - Fires onDoubleClick when double-clicked
 *   - Applies correct cursor style for drag affordance
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import DraggableEvent from '../components/DraggableEvent.jsx';

/**
 * Helper to wrap DraggableEvent in a DndContext (required by @dnd-kit).
 * Tests don't need actual drag behavior, just DOM rendering.
 */
function renderWithDnd(ui) {
  return render(<DndContext>{ui}</DndContext>);
}

const mockEvent = {
  id: 'evt-1',
  title: 'Test Event',
  start: '2026-06-28T09:00:00Z',
  end: '2026-06-28T10:00:00Z',
};

describe('DraggableEvent', () => {
  it('renders children content', () => {
    renderWithDnd(
      <DraggableEvent event={mockEvent} style={{}} onDoubleClick={() => {}}>
        <span>Event Content</span>
      </DraggableEvent>
    );

    expect(screen.getByText('Event Content')).toBeInTheDocument();
  });

  it('has accessible role="button" and tabIndex', () => {
    renderWithDnd(
      <DraggableEvent event={mockEvent} style={{}} onDoubleClick={() => {}}>
        <span>Event</span>
      </DraggableEvent>
    );

    const element = screen.getByRole('button');
    expect(element).toBeInTheDocument();
    expect(element).toHaveAttribute('tabindex', '0');
  });

  it('has an aria-label describing the interaction', () => {
    renderWithDnd(
      <DraggableEvent event={mockEvent} style={{}} onDoubleClick={() => {}}>
        <span>Event</span>
      </DraggableEvent>
    );

    const element = screen.getByRole('button');
    expect(element.getAttribute('aria-label')).toContain('Test Event');
    expect(element.getAttribute('aria-label')).toContain('double-click to edit');
  });

  it('calls onDoubleClick handler when double-clicked', () => {
    const handleDoubleClick = vi.fn();
    renderWithDnd(
      <DraggableEvent event={mockEvent} style={{}} onDoubleClick={handleDoubleClick}>
        <span>Event</span>
      </DraggableEvent>
    );

    const element = screen.getByRole('button');
    fireEvent.doubleClick(element);

    expect(handleDoubleClick).toHaveBeenCalledTimes(1);
  });

  it('applies the grab cursor style', () => {
    renderWithDnd(
      <DraggableEvent event={mockEvent} style={{}} onDoubleClick={() => {}}>
        <span>Event</span>
      </DraggableEvent>
    );

    const element = screen.getByRole('button');
    expect(element.style.cursor).toBe('grab');
  });

  it('applies custom positioning styles', () => {
    const customStyle = { position: 'absolute', top: '25%', height: '10%' };
    renderWithDnd(
      <DraggableEvent event={mockEvent} style={customStyle} onDoubleClick={() => {}}>
        <span>Event</span>
      </DraggableEvent>
    );

    const element = screen.getByRole('button');
    expect(element.style.position).toBe('absolute');
    expect(element.style.top).toBe('25%');
    expect(element.style.height).toBe('10%');
  });
});
