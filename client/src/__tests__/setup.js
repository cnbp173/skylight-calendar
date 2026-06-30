import '@testing-library/jest-dom';

// Mock ResizeObserver which is not available in jsdom.
// Used by DayColumn to measure the time grid's pixel height for resize calculations.
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this._callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};
