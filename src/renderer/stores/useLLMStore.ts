/**
 * LLM Store
 * 
 * Zustand store for managing LLM provider configuration,
 * request queue state, and response badges
 */

import { create } from 'zustand';
import { LLMProviderConfig } from '@shared/types/llm';

interface CurrentRequest {
  id: string;
  promptId: string;
  startedAt: number;
  elapsedMs: number;
}

interface LLMState {
  // Provider state
  providers: LLMProviderConfig[];
  activeProvider: LLMProviderConfig | null;
  
  // Queue state
  queueSize: number;
  currentRequest: CurrentRequest | null;
  
  // Badge counters (per-prompt new results)
  newResultsCount: Record<string, number>; // promptId -> count
  
  // Provider actions
  setProviders: (providers: LLMProviderConfig[]) => void;
  setActiveProvider: (provider: LLMProviderConfig | null) => void;
  addProvider: (provider: LLMProviderConfig) => void;
  removeProvider: (providerId: string) => void;
  updateProvider: (providerId: string, updates: Partial<LLMProviderConfig>) => void;
  
  // Queue actions
  updateQueueStatus: (size: number) => void;
  setCurrentRequest: (request: CurrentRequest | null) => void;
  
  // Badge actions
  incrementNewResults: (promptId: string) => void;
  clearNewResults: (promptId: string) => void;
  resetNewResults: () => void;
  getNewResultsCount: (promptId: string) => number;
}

export const useLLMStore = create<LLMState>((set, get) => ({
  // Initial state
  providers: [],
  activeProvider: null,
  queueSize: 0,
  currentRequest: null,
  newResultsCount: {},
  
  // Provider actions
  setProviders: (providers) => set({ providers }),
  
  setActiveProvider: (provider) => set({ activeProvider: provider }),
  
  addProvider: (provider) => set((state) => ({
    providers: [...state.providers, provider]
  })),
  
  removeProvider: (providerId) => set((state) => ({
    providers: state.providers.filter(p => p.id !== providerId),
    activeProvider: state.activeProvider?.id === providerId ? null : state.activeProvider
  })),
  
  updateProvider: (providerId, updates) => set((state) => ({
    providers: state.providers.map(p =>
      p.id === providerId ? { ...p, ...updates } : p
    ),
    activeProvider: state.activeProvider?.id === providerId
      ? { ...state.activeProvider, ...updates }
      : state.activeProvider
  })),
  
  // Queue actions
  updateQueueStatus: (size) => set({ queueSize: size }),
  
  setCurrentRequest: (request) => set({ currentRequest: request }),
  
  // Badge actions
  incrementNewResults: (promptId) => set((state) => ({
    newResultsCount: {
      ...state.newResultsCount,
      [promptId]: (state.newResultsCount[promptId] || 0) + 1
    }
  })),
  
  clearNewResults: (promptId) => set((state) => {
    const { [promptId]: _, ...rest } = state.newResultsCount;
    return { newResultsCount: rest };
  }),
  
  resetNewResults: () => set({ newResultsCount: {} }),
  
  getNewResultsCount: (promptId) => {
    const state = get();
    return state.newResultsCount[promptId] || 0;
  }
}));

