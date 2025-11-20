/**
 * LLM Queue Indicator
 * 
 * Global indicator showing pending/in-progress LLM requests
 * Displayed in the title bar with "Cancel All" functionality
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLLMStore } from '@renderer/stores/useLLMStore';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { toast } from '@renderer/components/common/ToastContainer';

export const LLMQueueIndicator: React.FC = () => {
  const { t } = useTranslation();
  const { queueSize, currentRequest } = useLLMStore();

  const handleCancelAll = async () => {
    try {
      const result = await window.electronAPI.invoke(IPC_CHANNELS.LLM_CANCEL_ALL, {});
      
      if (result.success) {
        toast.success(t('llm.queue.cancelledAll'));
      } else {
        toast.error(result.error || t('llm.errors.cancelFailed'));
      }
    } catch (error) {
      console.error('Failed to cancel all requests:', error);
      toast.error(t('llm.errors.cancelFailed'));
    }
  };

  // Don't show if no queue
  if (queueSize === 0 && !currentRequest) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3 px-3 py-1 bg-blue-50 rounded-md border border-blue-200">
      {/* Spinner */}
      <div className="flex items-center space-x-2">
        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="text-sm text-blue-700 font-medium">
          {currentRequest 
            ? t('llm.queue.processing', { current: 1, total: queueSize + 1 })
            : t('llm.queue.queued', { count: queueSize })}
        </span>
      </div>

      {/* Cancel All Button */}
      {(queueSize > 0 || currentRequest) && (
        <button
          onClick={handleCancelAll}
          className="text-xs px-2 py-1 text-red-600 hover:bg-red-100 rounded transition-colors"
          title={t('llm.queue.cancelAll')}
        >
          {t('llm.queue.cancelAll')}
        </button>
      )}
    </div>
  );
};

