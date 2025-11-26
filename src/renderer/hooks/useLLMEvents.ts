/**
 * Hook to listen to LLM-related IPC events and update the store
 */

import { useEffect, useRef } from 'react';
import { useLLMStore } from '@renderer/stores/useLLMStore';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import type { LLMQueueUpdatedEvent, LLMResponseCompleteEvent, LLMRequestProgressEvent } from '@shared/types/llm-ipc';
import { toast } from '@renderer/components/common/ToastContainer';
import { useTranslation } from 'react-i18next';

// Define handlers outside component to ensure stable references
const handleQueueUpdate = (store: any) => (event: LLMQueueUpdatedEvent) => {
  console.log('[LLM Events] Queue updated:', event);
  store.updateQueueStatus(event.queueSize);
};

const handleRequestProgress = (store: any) => (event: LLMRequestProgressEvent) => {
  console.log('[LLM Events] Request progress:', event);
  if (event.status === 'processing') {
    store.setCurrentRequest({
      id: event.requestId,
      promptId: '', // We don't have promptId in progress event
      startedAt: Date.now(),
      elapsedMs: event.elapsedMs || 0
    });
  }
  // DO NOT handle completed/failed/cancelled here - that's handled by LLM_RESPONSE_COMPLETE
};

const handleResponseComplete = (store: any, t: any) => (event: LLMResponseCompleteEvent) => {
  console.log('[LLM Events] Response complete:', event);
  
  if (event.status === 'completed') {
    // Increment badge counter for this prompt
    store.incrementNewResults(event.promptId);
    
    // Show success toast
    toast.success(t('llm.callExtended.success'));
  } else if (event.status === 'failed' && event.error) {
    // Show error toast
    toast.error(event.error);
  }
  
  // Clear current request
  store.setCurrentRequest(null);
};

export function useLLMEvents() {
  const { t } = useTranslation();
  const store = useLLMStore();
  const handlersRegistered = useRef(false);
  const handlersRef = useRef<{
    queue?: any;
    progress?: any;
    complete?: any;
  }>({});

  useEffect(() => {
    // Check if running in Electron environment
    if (!window.electronAPI) {
      console.warn('[LLM Events] Not running in Electron environment, skipping event listeners');
      return;
    }

    // Prevent double registration (React 18 Strict Mode can call effects twice)
    if (handlersRegistered.current) {
      console.log('[LLM Events] Handlers already registered, skipping');
      return;
    }

    console.log('[LLM Events] Setting up event listeners');

    // First, aggressively remove ANY existing listeners
    if (handlersRef.current.queue) {
      window.electronAPI.removeAllListeners(IPC_CHANNELS.LLM_QUEUE_UPDATED);
    }
    if (handlersRef.current.progress) {
      window.electronAPI.removeAllListeners(IPC_CHANNELS.LLM_REQUEST_PROGRESS);
    }
    if (handlersRef.current.complete) {
      window.electronAPI.removeAllListeners(IPC_CHANNELS.LLM_RESPONSE_COMPLETE);
    }

    // Create bound handlers
    const queueHandler = handleQueueUpdate(store);
    const progressHandler = handleRequestProgress(store);
    const completeHandler = handleResponseComplete(store, t);

    // Store handler references
    handlersRef.current = {
      queue: queueHandler,
      progress: progressHandler,
      complete: completeHandler
    };

    // Register event listeners
    window.electronAPI.on(IPC_CHANNELS.LLM_QUEUE_UPDATED, queueHandler);
    window.electronAPI.on(IPC_CHANNELS.LLM_REQUEST_PROGRESS, progressHandler);
    window.electronAPI.on(IPC_CHANNELS.LLM_RESPONSE_COMPLETE, completeHandler);

    handlersRegistered.current = true;
    console.log('[LLM Events] Event listeners registered');

    // Cleanup on unmount
    return () => {
      if (!window.electronAPI) return;
      
      console.log('[LLM Events] Cleaning up event listeners');
      window.electronAPI.removeAllListeners(IPC_CHANNELS.LLM_QUEUE_UPDATED);
      window.electronAPI.removeAllListeners(IPC_CHANNELS.LLM_REQUEST_PROGRESS);
      window.electronAPI.removeAllListeners(IPC_CHANNELS.LLM_RESPONSE_COMPLETE);
      handlersRegistered.current = false;
      handlersRef.current = {};
    };
  }, []); // Empty dependencies - only run once
}

