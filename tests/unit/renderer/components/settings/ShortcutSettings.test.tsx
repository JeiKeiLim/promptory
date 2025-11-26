import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShortcutSettings } from '../../../../../src/renderer/components/settings/ShortcutSettings';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

// Mock Zustand store
vi.mock('@renderer/stores/useAppStore', () => ({
  useAppStore: () => ({
    settings: {
      shortcuts: {
        newPrompt: 'CmdOrCtrl+N',
        search: 'CmdOrCtrl+F',
        toggleFavorite: 'CmdOrCtrl+D',
        usePrompt: 'CmdOrCtrl+Enter',
        editPrompt: 'CmdOrCtrl+E',
        copyContent: 'CmdOrCtrl+C',
        showHelp: 'CmdOrCtrl+?',
        exitEdit: 'Escape',
        refresh: 'CmdOrCtrl+R'
      }
    },
    updateSettings: vi.fn(),
    resetSettings: vi.fn()
  })
}));

describe.skip('ShortcutSettings - List Spacing (skipped - jsdom env issues)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have px-4 (16px) left and right margins on shortcut list container', () => {
    render(<ShortcutSettings />);
    
    // Find the shortcut list container
    const listContainer = screen.getByTestId('shortcut-list-container');
    
    // Verify it has px-4 class (16px horizontal padding)
    expect(listContainer).toHaveClass('px-4');
    
    // Also verify other expected classes are present
    expect(listContainer).toHaveClass('border');
    expect(listContainer).toHaveClass('border-gray-200');
    expect(listContainer).toHaveClass('rounded-lg');
  });
});
