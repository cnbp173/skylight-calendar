/**
 * ResizeHandle Component — Unit Tests
 *
 * Tests the resize handle rendering and basic behavior:
 *   - Renders with correct accessibility attributes
 *   - Has the south-resize cursor style
 *   - Stops event propagation on pointer down (prevents drag-and-drop interference)
 *   - Renders the visual indicator element
 *
 * Note: Full pointer-drag interaction testing (pointerDown → pointerMove → pointerUp)
 * is not reliable in jsdom because pointer capture APIs aren't fully implemented.
 * The resize calculations are tested indirectly via the DayColumn integration test.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResizeHandle from '../components/ResizeHandle.jsx';

const mockEvent = {
  id: 'evt-1',
  title: 'Test Event',
  calendarId: 'cal1',
  start: '2026-06-29T09:00:00',
  end: '2026-06-29T10:00:00',
};

describe('ResizeHandle', () => {
  const defaultProps = {
    event: mockEvent,
    dayStartHour: 7,
    dayEndHour: 22,
    gridHeight: 600,
    onResize: vi.fn(),
    onResizeEnd: vi.fn(),
  };

  it('renders with accessible aria-label', () => {
    render(<ResizeHandle {...defaultProps} />);

    const handle = screen.getByLabelText(/Resize Test Event/);
    expect(handle).toBeInTheDocument();
  });

  it('includes instructions in the aria-label', () => {
    render(<ResizeHandle {...defaultProps} />);

    const handle = screen.getByLabelText(/Drag down to extend, up to shorten/);
    expect(handle).toBeInTheDocument();
  });

  it('has a title tooltip for sighted users', () => {
    render(<ResizeHandle {...defaultProps} />);

    const handle = screen.getByTitle('Drag to resize');
    expect(handle).toBeInTheDocument();
  });

  it('has the south-resize cursor to indicate vertical resizability', () => {
    render(<ResizeHandle {...defaultProps} />);

    const handle = screen.getByTitle('Drag to resize');
    expect(handle.style.cursor).toBe('s-resize');
  });

  it('is positioned absolutely at the bottom of its parent', () => {
    render(<ResizeHandle {...defaultProps} />);

    const handle = screen.getByTitle('Drag to resize');
    expect(handle.style.position).toBe('absolute');
    expect(handle.style.bottom).toBe('0px');
  });

  it('renders the visual indicator bar', () => {
    const { container } = render(<ResizeHandle {...defaultProps} />);

    // The indicator is a child div inside the handle
    const handle = screen.getByTitle('Drag to resize');
    const indicator = handle.firstChild;
    expect(indicator).toBeTruthy();
    expect(indicator.style.width).toBe('20px');
    expect(indicator.style.height).toBe('3px');
    expect(indicator.style.borderRadius).toBe('2px');
  });

  it('does not propagate pointer down to parent elements', () => {
    // Wrap in a parent with a pointerDown handler to verify stopPropagation
    const parentHandler = vi.fn();
    const { container } = render(
      <div onPointerDown={parentHandler}>
        <ResizeHandle {...defaultProps} />
      </div>
    );

    const handle = screen.getByTitle('Drag to resize');
    // Mock setPointerCapture since jsdom doesn't implement it
    handle.setPointerCapture = vi.fn();

    fireEvent.pointerDown(handle, { clientY: 300, pointerId: 1 });

    // Parent's handler should NOT have been called (stopPropagation)
    expect(parentHandler).not.toHaveBeenCalled();
  });

  it('has touch-action none to prevent browser gestures during resize', () => {
    render(<ResizeHandle {...defaultProps} />);

    const handle = screen.getByTitle('Drag to resize');
    expect(handle.style.touchAction).toBe('none');
  });
});
