/**
 * 파라미터 입력 모달 - 프롬프트 사용 기능의 핵심 컴포넌트
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { PromptFile, PromptParameter } from '@shared/types/prompt';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import { toast } from '@renderer/components/common/ToastContainer';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useLLMStore } from '@renderer/stores/useLLMStore';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { LLMResponsePanel } from '@renderer/components/llm/LLMResponsePanel';
import { LLMBadge } from '@renderer/components/llm/LLMBadge';

interface ParameterInputModalProps {
  prompt: PromptFile;
  isOpen: boolean;
  onClose: () => void;
}

interface ParameterValues {
  [parameterName: string]: string;
}

export const ParameterInputModal: React.FC<ParameterInputModalProps> = ({
  prompt,
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();
  const { settings } = useAppStore();
  const { activeProvider, queueSize } = useLLMStore();
  const [parameterValues, setParameterValues] = useState<ParameterValues>({});
  const [processedContent, setProcessedContent] = useState('');
  const [autoClose, setAutoClose] = useState(settings.autoCloseModal);
  const [isLoading, setIsLoading] = useState(false);
  const [isCallingLLM, setIsCallingLLM] = useState(false);
  const [showResponsePanel, setShowResponsePanel] = useState(false);
  const [selectedResponseForView, setSelectedResponseForView] = useState<{id: string; content: string} | null>(null);

  // Safe markdown rendering helper
  const renderMarkdown = (content: string): string => {
    try {
      if (!content || content.trim().length === 0) {
        return '<p>No content available</p>';
      }
      // marked.parse() is the synchronous API
      return marked.parse(content) as string;
    } catch (error) {
      console.error('Markdown rendering error:', error);
      // Fallback to plain text with line breaks
      return `<pre>${content}</pre>`;
    }
  };

  // Reset panel state when modal closes
  const handleCloseModal = useCallback(() => {
    setShowResponsePanel(false);
    setSelectedResponseForView(null);
    onClose();
  }, [onClose]);

  // 모달이 열릴 때 파라미터 값 및 autoClose 상태 초기화
  useEffect(() => {
    if (isOpen && prompt) {
      const initialValues: ParameterValues = {};
      prompt.metadata.parameters.forEach(param => {
        initialValues[param.name] = '';
      });
      setParameterValues(initialValues);
      setAutoClose(settings.autoCloseModal); // 전역 설정에서 autoClose 상태 초기화
      
      // Reset response panel state when modal opens
      setShowResponsePanel(false);
      setSelectedResponseForView(null);
    }
  }, [isOpen, prompt, settings.autoCloseModal]);

  // 파라미터 값이 변경될 때마다 실시간으로 프롬프트 내용 업데이트
  useEffect(() => {
    if (prompt) {
      let content = prompt.content;
      
      // {{parameter_name}} 패턴을 실제 값으로 치환
      Object.entries(parameterValues).forEach(([paramName, value]) => {
        const regex = new RegExp(`\\{\\{${paramName}\\}\\}`, 'g');
        content = content.replace(regex, value || `{{${paramName}}}`);
      });
      
      setProcessedContent(content);
    }
  }, [parameterValues, prompt]);

  // 파라미터 값 변경 핸들러
  const handleParameterChange = (paramName: string, value: string) => {
    setParameterValues(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  // 클립보드 복사 핸들러
  const handleCopy = async () => {
    if (!processedContent.trim()) {
      toast.error(t('parameterInputModal.emptyContent'));
      return;
    }

    setIsLoading(true);
    try {
      await navigator.clipboard.writeText(processedContent);
      toast.success(t('parameterInputModal.copySuccess'));
      
      if (autoClose) {
        onClose();
      }
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      toast.error(t('parameterInputModal.copyFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // 필수 파라미터 검증
  const validateRequiredParameters = (): boolean => {
    const missingParams = prompt.metadata.parameters
      .filter(param => param.required && !parameterValues[param.name]?.trim())
      .map(param => param.name);

    if (missingParams.length > 0) {
      toast.error(`${t('parameterInputModal.requiredParams')}: ${missingParams.join(', ')}`);
      return false;
    }
    return true;
  };

  // 복사 버튼 클릭 시 검증 후 복사
  const handleCopyWithValidation = () => {
    if (validateRequiredParameters()) {
      handleCopy();
    }
  };

  // LLM 호출 핸들러
  const handleCallLLM = async () => {
    if (!validateRequiredParameters()) {
      return;
    }

    if (!activeProvider) {
      toast.error(t('llm.errors.noActiveProvider'));
      return;
    }

    if (!processedContent.trim()) {
      toast.error(t('parameterInputModal.emptyContent'));
      return;
    }

    setIsCallingLLM(true);
    try {
      const response = await window.electronAPI.invoke(IPC_CHANNELS.LLM_CALL, {
        promptId: prompt.id,
        promptName: prompt.metadata.title, // For human-readable directory names
        promptContent: processedContent,
        parameters: parameterValues
      });

      if (response.success) {
        toast.success(t('llm.call.queued'));
        // Don't close modal - user may want to make more calls or see results
      } else {
        toast.error(response.error || t('llm.errors.callFailed'));
      }
    } catch (error) {
      console.error('LLM call failed:', error);
      toast.error(t('llm.errors.callFailed'));
    } finally {
      setIsCallingLLM(false);
    }
  };

  // 키보드 단축키 처리 (ESC 및 Cmd+Shift+C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      // ESC 키로 모달 닫기
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      
      // Cmd+Shift+C로 복사
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        handleCopyWithValidation();
      }
    };

    if (isOpen) {
      // 모달이 열려있을 때는 더 높은 우선순위로 이벤트 리스너 등록 (capture phase)
      document.addEventListener('keydown', handleKeyDown, true);
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [isOpen, onClose, processedContent, parameterValues, prompt, autoClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full max-h-[90vh] flex flex-col transition-all duration-300 ${
        showResponsePanel ? 'max-w-[90vw]' : 'max-w-6xl'
      }`}>
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('parameterInputModal.title')}</h2>
            <p className="text-sm text-gray-600 mt-1">{prompt.metadata.title}</p>
          </div>
          <button
            onClick={handleCloseModal}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex min-h-0 relative">
          {/* 좌측: 파라미터 입력 OR 응답 전체 보기 (takes full left when viewing response) */}
          <div className={`p-6 border-r border-gray-200 overflow-y-auto transition-all duration-300 ${
            selectedResponseForView 
              ? (showResponsePanel ? 'w-2/3' : 'w-full')  // Full response takes 2/3 when sidebar open, full width when closed
              : (showResponsePanel ? 'w-1/3' : 'w-1/2')   // Parameters take 1/3 when sidebar open, 1/2 when closed
          }`}>
            {selectedResponseForView ? (
              // Show full response (takes full left side)
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{t('llm.response.content')}</h3>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(selectedResponseForView.content);
                        toast.success(t('llm.response.copiedToClipboard'));
                      } catch (error) {
                        toast.error(t('llm.errors.copyFailed'));
                      }
                    }}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    📋 {t('llm.response.copy')}
                  </button>
                </div>
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-y-auto">
                  {selectedResponseForView.content ? (
                    <div 
                      className="prose prose-sm max-w-none text-gray-800"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedResponseForView.content) }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📄</div>
                        <p>{t('llm.response.noContent') || 'No content available'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Show parameter inputs
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('parameterInputModal.parameterInput')}</h3>
                
                {prompt.metadata.parameters.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📝</div>
                    <p>{t('parameterInputModal.noParams')}</p>
                    <p className="text-sm mt-1">{t('parameterInputModal.copyDirectly')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                {prompt.metadata.parameters.map((param) => (
                  <div key={param.name} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {param.name}
                      {param.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {param.type === 'category' && param.options ? (
                      <select
                        value={parameterValues[param.name] || ''}
                        onChange={(e) => handleParameterChange(param.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t('parameterInputModal.selectOption')}</option>
                        {param.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <textarea
                        value={parameterValues[param.name] || ''}
                        onChange={(e) => handleParameterChange(param.name, e.target.value)}
                        placeholder={t('parameterInputModal.inputPlaceholder', { name: param.name })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    )}
                    
                    {param.description && param.description !== `${param.name} 파라미터` && (
                      <p className="text-xs text-gray-500">{param.description}</p>
                    )}
                  </div>
                ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 중앙: 실시간 미리보기 (hidden when viewing response) */}
          {!selectedResponseForView && (
            <div className={`p-6 overflow-y-auto transition-all duration-300 ${
              showResponsePanel ? 'w-1/3 border-r border-gray-200' : 'w-1/2'
            }`}>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('parameterInputModal.preview')}</h3>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[400px]">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                  {processedContent}
                </pre>
              </div>
            </div>
          )}

          {/* 우측: LLM Response Panel (slides in) */}
          <div className={`transition-all duration-300 overflow-hidden ${
            showResponsePanel ? 'w-1/3' : 'w-0'
          }`}>
            {showResponsePanel && (
              <div className="h-full p-4 overflow-y-auto bg-gray-50">
                <LLMResponsePanel
                  promptId={prompt.id}
                  isOpen={showResponsePanel}
                  onClose={() => {
                    setShowResponsePanel(false);
                    setSelectedResponseForView(null);
                  }}
                  onSelectResponse={(id: string, content: string) => {
                    console.log('[ParameterInputModal] Response selected:', {
                      id,
                      contentLength: content?.length || 0,
                      hasContent: !!content,
                      contentPreview: content?.slice(0, 100)
                    });
                    setSelectedResponseForView({ id, content });
                  }}
                  selectedResponseId={selectedResponseForView?.id || null}
                  onBackToParameters={() => setSelectedResponseForView(null)}
                />
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoClose}
                onChange={(e) => setAutoClose(e.target.checked)}
                className="mr-2"
              />
{t('parameterInputModal.autoClose')}
            </label>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Badge indicators */}
            <div className="flex items-center space-x-3">
              {/* New results badge for THIS prompt */}
              <LLMBadge promptId={prompt.id} />
              
              {/* Global queue indicator */}
              {queueSize > 0 && (
                <span className="text-sm text-gray-600">
                  {t('llm.queue.size', { count: queueSize })}
                </span>
              )}
            </div>
            
            {/* T133: Cancel button removed - X icon, ESC, and backdrop click handle modal closing */}
            
            {activeProvider && (
              <>
                <button
                  onClick={() => {
                    setShowResponsePanel(!showResponsePanel);
                    // Also reset full response view when toggling
                    if (showResponsePanel) {
                      setSelectedResponseForView(null);
                    }
                  }}
                  className={`px-4 py-2 text-sm border rounded-md transition-colors flex items-center space-x-2 ${
                    showResponsePanel 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                  title={t('llm.response.viewResponses')}
                >
                  <span>📋</span>
                  <span>{t('llm.response.viewResponses')}</span>
                </button>
                
                <button
                  onClick={handleCallLLM}
                  disabled={isCallingLLM || isLoading}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  title={t('llm.call.callLLM')}
                >
                  <span>🤖</span>
                  <span>{isCallingLLM ? t('llm.call.calling') : t('llm.call.callLLM')}</span>
                </button>
              </>
            )}
            
            <button
              onClick={handleCopyWithValidation}
              disabled={isLoading || isCallingLLM}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? t('parameterInputModal.copying') : t('parameterInputModal.copyToClipboard')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

