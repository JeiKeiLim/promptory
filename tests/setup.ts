import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// React Testing Library cleanup
afterEach(() => {
  cleanup();
});

// Mock electron API for all tests
const mockElectronAPI = {
  invoke: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  send: vi.fn()
};

// Setup window.electronAPI
Object.defineProperty(globalThis, 'window', {
  value: {
    electronAPI: mockElectronAPI,
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    location: {
      reload: vi.fn()
    }
  },
  writable: true,
  configurable: true
});

// Export for tests that need to access it
export { mockElectronAPI };
