/**
 * LLM Response Side Panel
 * 
 * Slides in from the right to show LLM response history
 * Does NOT block the ParameterInputModal
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { LLMResponseMetadata } from '@shared/types/llm';
import { toast } from '@renderer/components/common/ToastContainer';
import { useLLMStore } from '@renderer/stores/useLLMStore';

interface LLMResponsePanelProps {
  promptId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectResponse: (responseId: string, content: string) => void;
  selectedResponseId: string | null;
  onBackToParameters: () => void;
}

export const LLMResponsePanel: React.FC<LLMResponsePanelProps> = ({ promptId, isOpen, onClose, onSelectResponse, selectedResponseId, onBackToParameters }) => {
  const { t } = useTranslation();
  const { getNewResultsCount, clearNewResults } = useLLMStore();
  const [responses, setResponses] = useState<LLMResponseMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  // Load response history
  useEffect(() => {
    if (!isOpen) return; // Don't load if panel is closed
    
    // IMMEDIATELY clear old responses when promptId changes
    setResponses([]);
    setLoading(true);
    
    loadHistory();
    
    // Clear new results badge when panel opens
    clearNewResults(promptId);

    // Listen for new responses
    const unsubscribe = window.electronAPI.on(IPC_CHANNELS.LLM_RESPONSE_COMPLETE, (event: any) => {
      if (event.promptId === promptId) {
        loadHistory();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [promptId, isOpen]); // Reload when promptId OR isOpen changes

  const loadHistory = async () => {
    try {
      const result = await window.electronAPI.invoke(IPC_CHANNELS.LLM_GET_HISTORY, {
        promptId
      });

      if (result.responses) {
        // Sort by newest first
        const sorted = result.responses.sort((a: LLMResponseMetadata, b: LLMResponseMetadata) => 
          b.createdAt - a.createdAt
        );
        setResponses(sorted);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      toast.error(t('llm.errors.loadHistoryFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResponse = async (responseId: string) => {
    try {
      const result = await window.electronAPI.invoke(IPC_CHANNELS.LLM_GET_RESPONSE, {
        responseId
      });

      if (result.response) {
        // Call parent callback to show full response in left panel
        onSelectResponse(responseId, result.response.content);
      } else {
        toast.error(result.error || t('llm.errors.loadResponseFailed'));
      }
    } catch (error) {
      console.error('Failed to load response:', error);
      toast.error(t('llm.errors.loadResponseFailed'));
    }
  };


  const handleDeleteResponse = async (responseId: string) => {
    try {
      const result = await window.electronAPI.invoke(IPC_CHANNELS.LLM_DELETE_RESPONSE, {
        responseId
      });

      if (result.success) {
        toast.success(t('llm.response.deleted'));
        setResponses(prev => prev.filter(r => r.id !== responseId));
      } else {
        toast.error(result.error || t('llm.errors.deleteFailed'));
      }
    } catch (error) {
      console.error('Failed to delete response:', error);
      toast.error(t('llm.errors.deleteFailed'));
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(t('llm.response.confirmDeleteAll'))) {
      return;
    }

    try {
      const result = await window.electronAPI.invoke(IPC_CHANNELS.LLM_DELETE_ALL_RESPONSES, {
        promptId
      });

      if (result.success) {
        toast.success(t('llm.response.allDeleted'));
        setResponses([]);
      } else {
        toast.error(result.error || t('llm.errors.deleteFailed'));
      }
    } catch (error) {
      console.error('Failed to delete all responses:', error);
      toast.error(t('llm.errors.deleteFailed'));
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {t('llm.response.history')}
          </h3>
          {responses.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
              title={t('llm.response.deleteAll')}
            >
              🗑️
            </button>
          )}
        </div>
        
        {/* Back to Parameters button (shown when viewing a response) */}
        {selectedResponseId && (
          <button
            onClick={onBackToParameters}
            className="w-full px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center"
          >
            ← {t('parameterInputModal.backToParameters')}
          </button>
        )}
      </div>

      {/* Response List */}
      <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-gray-500">{t('llm.response.loading')}</div>
            </div>
          ) : responses.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-4xl mb-4">🤖</div>
              <p className="text-gray-500">{t('llm.response.noResponses')}</p>
              <p className="text-sm text-gray-400 mt-2">
                {t('llm.response.makeFirstCall')}
              </p>
            </div>
          ) : (
            <>
              <div className="p-2 bg-gray-50 border-b border-gray-200">
                <div className="text-xs text-gray-600">
                  {responses.length} {responses.length === 1 ? 'response' : 'responses'}
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {responses.map((response) => (
                  <div
                    key={response.id}
                    className={`p-3 transition-colors border-l-4 ${
                      selectedResponseId === response.id 
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
                          onClick={async (e) => {
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
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700"
                          title={t('llm.response.copy')}
                        >
                          📋
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteResponse(response.id);
                          }}
                          className="text-xs text-gray-400 hover:text-red-600"
                          title={t('llm.response.delete')}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div 
                      onClick={() => handleSelectResponse(response.id)}
                      className="cursor-pointer"
                    >
                    
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {response.model}
                      </div>
                      
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
                ))}
              </div>
            </>
          )}
        </div>
    </div>
  );
};

