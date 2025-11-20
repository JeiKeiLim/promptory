/**
 * Unit Tests for useLLMStore (TDD)
 * 
 * Tests Zustand store for LLM state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useLLMStore } from '@renderer/stores/useLLMStore';

describe('useLLMStore', () => {
  beforeEach(() => {
    // Reset store state directly
    useLLMStore.getState().setProviders([]);
    useLLMStore.getState().setActiveProvider(null);
    useLLMStore.getState().updateQueueStatus(0);
    useLLMStore.getState().setCurrentRequest(null);
    useLLMStore.getState().resetNewResults();
  });

  describe('provider management', () => {
    it('should initialize with empty providers', () => {
      const state = useLLMStore.getState();
      
      expect(state.providers).toEqual([]);
      expect(state.activeProvider).toBeNull();
    });

    it('should set providers list', () => {
      const providers = [
        {
          id: 'provider-1',
          providerType: 'ollama' as const,
          displayName: 'Local Ollama',
          isActive: true,
          timeoutSeconds: 120,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      useLLMStore.getState().setProviders(providers);

      expect(useLLMStore.getState().providers).toEqual(providers);
    });

    it('should set active provider', () => {
      const provider = {
        id: 'provider-1',
        providerType: 'ollama' as const,
        displayName: 'Local Ollama',
        isActive: true,
        timeoutSeconds: 120,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      useLLMStore.getState().setActiveProvider(provider);

      expect(useLLMStore.getState().activeProvider).toEqual(provider);
    });

    it('should clear active provider', () => {
      const provider = {
        id: 'provider-1',
        providerType: 'ollama' as const,
        displayName: 'Local Ollama',
        isActive: true,
        timeoutSeconds: 120,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      useLLMStore.getState().setActiveProvider(provider);
      expect(useLLMStore.getState().activeProvider).toEqual(provider);

      useLLMStore.getState().setActiveProvider(null);
      expect(useLLMStore.getState().activeProvider).toBeNull();
    });
  });

  describe('queue state management', () => {
    it('should initialize with empty queue', () => {
      const state = useLLMStore.getState();
      
      expect(state.queueSize).toBe(0);
      expect(state.currentRequest).toBeNull();
    });

    it('should update queue size', () => {
      useLLMStore.getState().updateQueueStatus(3);
      expect(useLLMStore.getState().queueSize).toBe(3);
    });

    it('should set current request', () => {
      const request = {
        id: 'req-1',
        promptId: 'prompt-1',
        startedAt: Date.now(),
        elapsedMs: 1000
      };

      useLLMStore.getState().setCurrentRequest(request);
      expect(useLLMStore.getState().currentRequest).toEqual(request);
    });

    it('should clear current request', () => {
      const request = {
        id: 'req-1',
        promptId: 'prompt-1',
        startedAt: Date.now(),
        elapsedMs: 1000
      };

      useLLMStore.getState().setCurrentRequest(request);
      expect(useLLMStore.getState().currentRequest).toEqual(request);

      useLLMStore.getState().setCurrentRequest(null);
      expect(useLLMStore.getState().currentRequest).toBeNull();
    });
  });

  describe('badge counter management', () => {
    it('should initialize with empty badge counters', () => {
      const state = useLLMStore.getState();
      expect(state.newResultsCount).toEqual({});
    });

    it('should increment new results count for a prompt', () => {
      useLLMStore.getState().incrementNewResults('prompt-1');
      expect(useLLMStore.getState().getNewResultsCount('prompt-1')).toBe(1);

      useLLMStore.getState().incrementNewResults('prompt-1');
      expect(useLLMStore.getState().getNewResultsCount('prompt-1')).toBe(2);
    });

    it('should clear new results count for a prompt', () => {
      useLLMStore.getState().incrementNewResults('prompt-1');
      useLLMStore.getState().incrementNewResults('prompt-2');

      expect(useLLMStore.getState().getNewResultsCount('prompt-1')).toBe(1);
      expect(useLLMStore.getState().getNewResultsCount('prompt-2')).toBe(1);

      useLLMStore.getState().clearNewResults('prompt-1');

      expect(useLLMStore.getState().getNewResultsCount('prompt-1')).toBe(0);
      expect(useLLMStore.getState().getNewResultsCount('prompt-2')).toBe(1);
    });

    it('should reset all new results counts', () => {
      useLLMStore.getState().incrementNewResults('prompt-1');
      useLLMStore.getState().incrementNewResults('prompt-2');
      useLLMStore.getState().incrementNewResults('prompt-3');

      expect(useLLMStore.getState().getNewResultsCount('prompt-1')).toBe(1);
      expect(useLLMStore.getState().getNewResultsCount('prompt-2')).toBe(1);

      useLLMStore.getState().resetNewResults();

      expect(useLLMStore.getState().newResultsCount).toEqual({});
      expect(useLLMStore.getState().getNewResultsCount('prompt-1')).toBe(0);
    });
  });
});

