/**
 * 파라미터 입력 모달 - 프롬프트 사용 기능의 핵심 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import type { PromptFile, PromptParameter } from '@shared/types/prompt';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import { toast } from '@renderer/components/common/ToastContainer';

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
  const [parameterValues, setParameterValues] = useState<ParameterValues>({});
  const [processedContent, setProcessedContent] = useState('');
  const [autoClose, setAutoClose] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // 모달이 열릴 때 파라미터 값 초기화
  useEffect(() => {
    if (isOpen && prompt) {
      const initialValues: ParameterValues = {};
      prompt.metadata.parameters.forEach(param => {
        initialValues[param.name] = '';
      });
      setParameterValues(initialValues);
    }
  }, [isOpen, prompt]);

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
  }, [isOpen, onClose, processedContent, parameterValues, prompt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('parameterInputModal.title')}</h2>
            <p className="text-sm text-gray-600 mt-1">{prompt.metadata.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex min-h-0">
          {/* 좌측: 파라미터 입력 */}
          <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
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
          </div>

          {/* 우측: 실시간 미리보기 */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('parameterInputModal.preview')}</h3>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[400px]">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                {processedContent}
              </pre>
            </div>
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
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {t('confirm.cancel')}
            </button>
            <button
              onClick={handleCopyWithValidation}
              disabled={isLoading}
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

