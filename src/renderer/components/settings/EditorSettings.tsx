/**
 * 에디터 설정 탭
 */

import React from 'react';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useTranslation } from 'react-i18next';

export const EditorSettings: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStore();

  // 안전한 기본값 설정
  const editorSettings = settings.editor || {
    wordWrap: true,
    showLineNumbers: false
  };

  const handleWordWrapChange = (wordWrap: boolean) => {
    updateSettings({
      editor: { ...editorSettings, wordWrap }
    });
  };

  const handleShowLineNumbersChange = (showLineNumbers: boolean) => {
    updateSettings({
      editor: { ...editorSettings, showLineNumbers }
    });
  };

  return (
    <div className="space-y-6">
      {/* 워드랩 */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <label 
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-primary, #111827)' }}
            >
              {t('settings.wordWrap')}
            </label>
          </div>
          <input
            type="checkbox"
            checked={editorSettings.wordWrap}
            onChange={(e) => handleWordWrapChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            style={{
              borderColor: 'var(--color-border-primary, #d1d5db)',
              backgroundColor: 'var(--color-bg-primary, #ffffff)'
            }}
          />
        </div>
      </div>

      {/* 줄 번호 표시 */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <label 
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-primary, #111827)' }}
            >
              {t('settings.showLineNumbers')}
            </label>
          </div>
          <input
            type="checkbox"
            checked={editorSettings.showLineNumbers}
            onChange={(e) => handleShowLineNumbersChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            style={{
              borderColor: 'var(--color-border-primary, #d1d5db)',
              backgroundColor: 'var(--color-bg-primary, #ffffff)'
            }}
          />
        </div>
      </div>
    </div>
  );
};
