/**
 * 테스트 환경 설정
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.electronAPI for tests
(global as any).window = {
  electronAPI: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  }
};
