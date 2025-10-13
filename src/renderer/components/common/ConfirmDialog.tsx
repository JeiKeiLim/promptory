/**
 * 확인 다이얼로그 컴포넌트 (3개 옵션: 저장, 저장하지 않음, 취소)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onSave: () => void;
  onDontSave: () => void;
  onCancel: () => void;
  saveButtonText?: string;
  dontSaveButtonText?: string;
  cancelButtonText?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onSave,
  onDontSave,
  onCancel,
  saveButtonText,
  dontSaveButtonText,
  cancelButtonText
}) => {
  const { t } = useTranslation();
  
  // 기본값 설정 (번역된 텍스트 사용)
  const finalSaveText = saveButtonText || t('confirm.save');
  const finalDontSaveText = dontSaveButtonText || t('confirm.dontSave');
  const finalCancelText = cancelButtonText || t('confirm.cancel');

  // ESC 키 처리 - hooks는 항상 조건부 return 전에 호출되어야 함
  React.useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          {message}
        </p>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            {finalCancelText}
          </button>
          
          {finalDontSaveText !== finalCancelText && (
            <button
              onClick={() => {
                onDontSave();
              }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {finalDontSaveText}
            </button>
          )}
          
          <button
            onClick={() => {
              onSave();
            }}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              finalSaveText === t('confirm.delete')
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {finalSaveText}
          </button>
        </div>
      </div>
    </div>
  );
};
