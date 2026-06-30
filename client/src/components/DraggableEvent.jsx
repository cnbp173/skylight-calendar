/**
 * DraggableEvent Component
 *
 * A wrapper that makes an event card draggable using @dnd-kit.
 * It wraps the event card in a positioned container that the DndContext
 * can pick up and move.
 *
 * Interaction model (designed for iPazzPort touchpad):
 *   - Single click: no action (avoids accidental triggers with touchpad)
 *   - Click and drag (5px+ movement): starts drag-and-drop to reschedule
 *   - Double-click: opens the edit dialog for full editing
 *
 * The 5px activation distance (configured in WeekView's PointerSensor)
 * prevents touchpad tap-to-click from accidentally starting a drag.
 *
 * Props:
 *   @param {object} event - The event data object
 *   @param {object} style - Positioning styles (absolute position within the day grid)
 *   @param {function} onDoubleClick - Handler for opening the edit dialog
 *   @param {React.ReactNode} children - The EventCard to render inside
 */

import React from 'react';
import { useDraggable } from '@dnd-kit/core';

export default function DraggableEvent({ event, style, onDoubleClick, children }) {
  /**
   * Register this element as draggable with @dnd-kit.
   * The ID matches the event's ID, so when a drag ends, WeekView
   * can look up which event was moved.
   *
   * - attributes: ARIA attributes for accessibility (role, tabindex, etc.)
   * - listeners: Pointer event handlers that detect drag gestures
   * - setNodeRef: Ref callback to register the DOM node
   * - isDragging: True while this item is being dragged
   */
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        // Fade the original card slightly while dragging (the DragOverlay
        // shows a floating copy that follows the cursor)
        opacity: isDragging ? 0.4 : 1,
        // Show a grab cursor to signal the element is draggable
        cursor: 'grab',
      }}
      // Spread dnd-kit's pointer listeners and ARIA attributes
      {...listeners}
      {...attributes}
      // Double-click opens the edit dialog for full editing capability
      onDoubleClick={onDoubleClick}
      // Accessible label for screen readers (and iPazzPort Tab navigation)
      aria-label={`Event: ${event.title}. Drag to reschedule or double-click to edit.`}
      role="button"
      tabIndex={0}
    >
      {children}
    </div>
  );
}
