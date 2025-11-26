/**
 * Response List Item Component
 * 
 * Displays a single LLM response in the history list
 * Shows title (if available) or model name as fallback
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { LLMResponseMetadata } from '@shared/types/llm';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { toast } from '@renderer/components/common/ToastContainer';

interface ResponseListItemProps {
  response: LLMResponseMetadata;
  isSelected: boolean;
  onSelect: (responseId: string) => void;
  onDelete: (responseId: string) => void;
  titleLoading?: boolean;
}

export const ResponseListItem: React.FC<ResponseListItemProps> = ({
  response,
  isSelected,
  onSelect,
  onDelete,
  titleLoading = false
}) => {
  const { t } = useTranslation();

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return t('llm.time.justNow');
    if (diffMins < 60) return t('llm.time.minutesAgo', { count: diffMins });
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t('llm.time.hoursAgo', { count: diffHours });
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await window.electronAPI.invoke(IPC_CHANNELS.LLM_GET_RESPONSE, {
        responseId: response.id
      });
      if (result.response) {
        await navigator.clipboard.writeText(result.response.content);
        toast.success(t('llm.response.copiedToClipboard'));
      }
    } catch (error) {
      toast.error(t('llm.errors.copyFailed'));
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(response.id);
  };

  // T045: Title display with prominent styling
  // Show title if available, otherwise show model name
  const displayTitle = response.generatedTitle || response.model;
  const showModelAsSecondary = !!response.generatedTitle;

  return (
    <div
      className={`p-3 transition-colors border-l-4 ${
        isSelected 
          ? 'bg-blue-50 border-blue-500'
          : 'border-transparent'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(response.status)}`}>
          {t(`llm.status.${response.status}`)}
        </span>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleCopy}
            className="text-xs text-blue-600 hover:text-blue-700"
            title={t('llm.response.copy')}
          >
            📋
          </button>
          <button
            onClick={handleDelete}
            className="text-xs text-gray-400 hover:text-red-600"
            title={t('llm.response.delete')}
          >
            🗑️
          </button>
        </div>
      </div>
      
      <div 
        onClick={() => onSelect(response.id)}
        className="cursor-pointer"
      >
        {/* T045: Prominent title display with loading indicator */}
        <div className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-2">
          <span className="flex-1">{displayTitle}</span>
          {/* T047: Loading indicator for title generation */}
          {titleLoading && (
            <span className="text-xs text-gray-400 animate-pulse">
              🔄
            </span>
          )}
        </div>
        
        {/* T046: Model name as secondary info if title exists */}
        {showModelAsSecondary && (
          <div className="text-xs text-gray-500 mb-1">
            {response.model}
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          {formatDate(response.createdAt)}
        </div>
        
        {response.responseTimeMs && (
          <div className="text-xs text-gray-500 mt-1">
            ⏱️ {formatDuration(response.responseTimeMs)}
          </div>
        )}
        
        {response.tokenUsage && (
          <div className="text-xs text-gray-500 mt-1">
            🔤 {response.tokenUsage.total} tokens
          </div>
        )}
      </div>
    </div>
  );
};
