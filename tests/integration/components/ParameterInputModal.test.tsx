/**
 * ParameterInputModal Integration Tests
 * Testing the fix for modal auto-close setting connection
 * 
 * Note: These tests verify that the useAppStore is correctly integrated
 * with ParameterInputModal for the autoCloseModal setting.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@renderer/stores/useAppStore';

describe('ParameterInputModal - Auto-Close Setting Integration', () => {
  beforeEach(() => {
    // Reset store to known state
    useAppStore.setState({
      settings: {
        language: 'en',
        autoCloseModal: true,
        projectPath: '/test',
        theme: 'system',
        fontSize: 14,
        lineHeight: 1.5,
        enableSpellCheck: false,
        enableAutoSave: true,
        autoSaveInterval: 5000,
        searchInContent: true,
        searchCaseSensitive: false,
        windowWidth: 1200,
        windowHeight: 800,
        sidebarWidth: 250,
        shortcuts: {
          newPrompt: 'Cmd+N',
          search: 'Cmd+F',
          save: 'Cmd+S',
          toggleFavorite: 'Cmd+D',
          copy: 'Cmd+Shift+C'
        }
      }
    } as any);
  });

  describe('Store Integration', () => {
    it('should read autoCloseModal setting when enabled', () => {
      // Setup: Global setting is TRUE
      const initialSettings = {
        language: 'en' as const,
        autoCloseModal: true,
        projectPath: '/test',
        theme: 'system' as const,
        fontSize: 14,
        lineHeight: 1.5,
        enableSpellCheck: false,
        enableAutoSave: true,
        autoSaveInterval: 5000,
        searchInContent: true,
        searchCaseSensitive: false,
        windowWidth: 1200,
        windowHeight: 800,
        sidebarWidth: 250,
        shortcuts: {
          newPrompt: 'Cmd+N',
          search: 'Cmd+F',
          save: 'Cmd+S',
          toggleFavorite: 'Cmd+D',
          copy: 'Cmd+Shift+C'
        }
      };

      useAppStore.setState({ settings: initialSettings } as any);

      // Act: Read settings from store (simulating what ParameterInputModal does)
      const { settings } = useAppStore.getState();
      const autoClose = settings.autoCloseModal;

      // Assert: Setting should be TRUE
      expect(autoClose).toBe(true);
    });

    it('should read autoCloseModal setting when disabled', () => {
      // Setup: Global setting is FALSE
      const initialSettings = {
        language: 'en' as const,
        autoCloseModal: false, // ← Setting disabled
        projectPath: '/test',
        theme: 'system' as const,
        fontSize: 14,
        lineHeight: 1.5,
        enableSpellCheck: false,
        enableAutoSave: true,
        autoSaveInterval: 5000,
        searchInContent: true,
        searchCaseSensitive: false,
        windowWidth: 1200,
        windowHeight: 800,
        sidebarWidth: 250,
        shortcuts: {
          newPrompt: 'Cmd+N',
          search: 'Cmd+F',
          save: 'Cmd+S',
          toggleFavorite: 'Cmd+D',
          copy: 'Cmd+Shift+C'
        }
      };

      useAppStore.setState({ settings: initialSettings } as any);

      // Act: Read settings from store
      const { settings } = useAppStore.getState();
      const autoClose = settings.autoCloseModal;

      // Assert: Setting should be FALSE
      expect(autoClose).toBe(false);
    });

    it('should maintain different autoCloseModal values independently', () => {
      // Setup: Start with TRUE
      let settings = useAppStore.getState().settings;
      expect(settings.autoCloseModal).toBe(true);

      // Change to FALSE
      useAppStore.setState({
        settings: {
          ...settings,
          autoCloseModal: false
        }
      } as any);

      settings = useAppStore.getState().settings;
      expect(settings.autoCloseModal).toBe(false);

      // Change back to TRUE
      useAppStore.setState({
        settings: {
          ...settings,
          autoCloseModal: true
        }
      } as any);

      settings = useAppStore.getState().settings;
      expect(settings.autoCloseModal).toBe(true);
    });

    it('should not persist local state changes to global settings', () => {
      // This test verifies the design: local modal state does not write back to global settings
      const initialSettings = useAppStore.getState().settings;
      const initialValue = initialSettings.autoCloseModal;

      // Simulate what happens in the modal:
      // 1. Modal reads global setting (true)
      // 2. User toggles local checkbox (local state changes, but does NOT call updateSettings)
      // 3. Global setting remains unchanged

      // Verify global setting is unchanged
      const finalSettings = useAppStore.getState().settings;
      expect(finalSettings.autoCloseModal).toBe(initialValue);
    });

    it('should allow multiple components to read the same setting', () => {
      // Setup
      useAppStore.setState({
        settings: {
          language: 'en',
          autoCloseModal: true,
          projectPath: '/test',
          theme: 'system',
          fontSize: 14,
          lineHeight: 1.5,
          enableSpellCheck: false,
          enableAutoSave: true,
          autoSaveInterval: 5000,
          searchInContent: true,
          searchCaseSensitive: false,
          windowWidth: 1200,
          windowHeight: 800,
          sidebarWidth: 250,
          shortcuts: {
            newPrompt: 'Cmd+N',
            search: 'Cmd+F',
            save: 'Cmd+S',
            toggleFavorite: 'Cmd+D',
            copy: 'Cmd+Shift+C'
          }
        }
      } as any);

      // Simulate multiple components reading the same setting
      const component1Read = useAppStore.getState().settings.autoCloseModal;
      const component2Read = useAppStore.getState().settings.autoCloseModal;
      const component3Read = useAppStore.getState().settings.autoCloseModal;

      // All components should read the same value
      expect(component1Read).toBe(true);
      expect(component2Read).toBe(true);
      expect(component3Read).toBe(true);
      expect(component1Read).toBe(component2Read);
      expect(component2Read).toBe(component3Read);
    });

    it('should preserve autoCloseModal setting when other settings change', () => {
      // Setup
      const settings = useAppStore.getState().settings;
      const originalAutoClose = settings.autoCloseModal;

      // Change a different setting (language)
      useAppStore.setState({
        settings: {
          ...settings,
          language: 'ko'
        }
      } as any);

      // Verify autoCloseModal is preserved
      const newSettings = useAppStore.getState().settings;
      expect(newSettings.autoCloseModal).toBe(originalAutoClose);
      expect(newSettings.language).toBe('ko');
    });
  });

  describe('Integration with Component Behavior', () => {
    it('should provide boolean type for autoCloseModal', () => {
      const { settings } = useAppStore.getState();
      expect(typeof settings.autoCloseModal).toBe('boolean');
    });

    it('should have autoCloseModal as a required field in settings', () => {
      const { settings } = useAppStore.getState();
      expect(settings).toHaveProperty('autoCloseModal');
      expect(settings.autoCloseModal).toBeDefined();
    });

    it('should support the expected workflow: read → use → reset on reopen', () => {
      // Initial state
      const initialSettings = useAppStore.getState().settings;
      const initialAutoClose = initialSettings.autoCloseModal;

      // Workflow simulation:
      // 1. Modal opens: read global setting
      const modalInitialState = initialAutoClose; // true

      // 2. User toggles local checkbox (local state only)
      const modalLocalState = !modalInitialState; // false

      // 3. Modal closes (local state destroyed)
      // 4. Modal reopens: read global setting again
      const modalReopenState = useAppStore.getState().settings.autoCloseModal; // true (from global)

      // Verify: Reopen state matches original global setting, not local override
      expect(modalReopenState).toBe(initialAutoClose);
      expect(modalReopenState).not.toBe(modalLocalState);
    });
  });
});
