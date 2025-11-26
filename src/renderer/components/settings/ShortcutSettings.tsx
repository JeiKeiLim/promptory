/**
 * 단축키 설정 탭
 */

import React, { useState } from 'react';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useTranslation } from 'react-i18next';

interface ShortcutInputProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

const ShortcutInput: React.FC<ShortcutInputProps> = ({ label, description, value, onChange }) => {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [currentKeys, setCurrentKeys] = useState<string[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isRecording) return;

    e.preventDefault();
    e.stopPropagation();

    const keys: string[] = [];
    
    if (e.ctrlKey || e.metaKey) {
      keys.push(e.ctrlKey ? 'Ctrl' : 'Cmd');
    }
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    
    if (e.key !== 'Control' && e.key !== 'Meta' && e.key !== 'Alt' && e.key !== 'Shift') {
      keys.push(e.key.toUpperCase());
    }

    setCurrentKeys(keys);
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (!isRecording) return;

    e.preventDefault();
    e.stopPropagation();

    if (currentKeys.length > 1) {
      const shortcut = currentKeys.join('+').replace('Cmd', 'CmdOrCtrl');
      onChange(shortcut);
      setIsRecording(false);
      setCurrentKeys([]);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setCurrentKeys([]);
  };

  const cancelRecording = () => {
    setIsRecording(false);
    setCurrentKeys([]);
  };

  const displayValue = isRecording 
    ? (currentKeys.length > 0 ? currentKeys.join(' + ') : t('settings.recording'))
    : value.replace('CmdOrCtrl', navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl');

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <div 
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-primary, #111827)' }}
        >
          {label}
        </div>
        <div 
          className="text-xs"
          style={{ color: 'var(--color-text-secondary, #6b7280)' }}
        >
          {description}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div
          className="px-3 py-1 text-sm border rounded-md min-w-[120px] text-center"
          style={{
            borderColor: isRecording 
              ? 'var(--color-accent, #3b82f6)' 
              : 'var(--color-border-primary, #e5e7eb)',
            backgroundColor: isRecording 
              ? 'var(--color-accent-light, #eff6ff)' 
              : 'var(--color-bg-primary, #ffffff)',
            color: isRecording 
              ? 'var(--color-accent, #3b82f6)' 
              : 'var(--color-text-primary, #111827)'
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          tabIndex={isRecording ? 0 : -1}
        >
          {displayValue}
        </div>
        {isRecording ? (
          <button
            onClick={cancelRecording}
            className="px-2 py-1 text-xs"
            style={{
              color: 'var(--color-text-secondary, #6b7280)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text-primary, #111827)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-secondary, #6b7280)';
            }}
          >
{t('confirm.cancel')}
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="px-2 py-1 text-xs"
            style={{
              color: 'var(--color-accent, #3b82f6)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-accent-dark, #2563eb)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-accent, #3b82f6)';
            }}
          >
{t('settings.change')}
          </button>
        )}
      </div>
    </div>
  );
};

export const ShortcutSettings: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateSettings, resetSettings } = useAppStore();

  // 안전한 기본값 설정
  const shortcutSettings = settings.shortcuts || {
    newPrompt: 'CmdOrCtrl+N',
    search: 'CmdOrCtrl+F',
    toggleFavorite: 'CmdOrCtrl+D',
    usePrompt: 'CmdOrCtrl+Enter',
    editPrompt: 'CmdOrCtrl+E',
    copyContent: 'CmdOrCtrl+C',
    showHelp: 'CmdOrCtrl+?',
    exitEdit: 'Escape',
    refresh: 'CmdOrCtrl+R'
  };

  const handleShortcutChange = (key: keyof typeof shortcutSettings, value: string) => {
    updateSettings({
      shortcuts: {
        ...shortcutSettings,
        [key]: value
      }
    });
  };

  const handleResetShortcuts = () => {
    if (confirm(t('settings.resetAllShortcuts'))) {
      resetSettings();
    }
  };

  const shortcutList = [
    {
      key: 'newPrompt' as const,
      label: t('settings.newPromptAction'),
      description: t('settings.newPromptDesc')
    },
    {
      key: 'search' as const,
      label: t('settings.searchAction'),
      description: t('settings.searchDesc')
    },
    {
      key: 'editPrompt' as const,
      label: t('settings.editModeAction'),
      description: t('settings.editModeDesc')
    },
    {
      key: 'usePrompt' as const,
      label: t('settings.usePromptAction'),
      description: t('settings.usePromptDesc')
    },
    {
      key: 'toggleFavorite' as const,
      label: t('settings.toggleFavoriteAction'),
      description: t('settings.toggleFavoriteDesc')
    },
    {
      key: 'copyContent' as const,
      label: t('settings.copyContentAction'),
      description: t('settings.copyContentDesc')
    },
    {
      key: 'refresh' as const,
      label: t('settings.refreshAction'),
      description: t('settings.refreshDesc')
    },
    {
      key: 'showHelp' as const,
      label: t('settings.helpAction'),
      description: t('settings.helpDesc')
    },
    {
      key: 'exitEdit' as const,
      label: t('settings.exitEditAction'),
      description: t('settings.exitEditDesc')
    }
  ];

  return (
    <div className="space-y-6" style={{ color: 'var(--color-text-primary, #111827)' }}>
      {/* 단축키 목록 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-primary, #111827)' }}
          >
            {t('settings.keyboardShortcuts')}
          </h4>
          <button
            onClick={handleResetShortcuts}
            className="px-3 py-1 text-sm border rounded-md"
            style={{
              color: 'var(--color-text-secondary, #6b7280)',
              borderColor: 'var(--color-border-primary, #e5e7eb)',
              backgroundColor: 'var(--color-bg-primary, #ffffff)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text-primary, #111827)';
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary, #f9fafb)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-secondary, #6b7280)';
              e.currentTarget.style.backgroundColor = 'var(--color-bg-primary, #ffffff)';
            }}
          >
            {t('settings.resetDefaults')}
          </button>
        </div>

        {/* T117: Add px-4 for 16px left and right margins */}
        <div className="px-4 border border-gray-200 rounded-lg divide-y divide-gray-200">
          {shortcutList.map((shortcut) => (
            <ShortcutInput
              key={shortcut.key}
              label={shortcut.label}
              description={shortcut.description}
              value={shortcutSettings[shortcut.key]}
              onChange={(value) => handleShortcutChange(shortcut.key, value)}
            />
          ))}
        </div>
      </div>

      {/* 단축키 사용법 */}
      <div className="border-t pt-6">
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>{t('settings.shortcutInstructions')}</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>{t('settings.shortcutTip1')}</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>{t('settings.shortcutTip2')}</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>{t('settings.shortcutTip3')}</span>
          </div>
        </div>
      </div>

      {/* 충돌 감지 (향후 구현) */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">{t('settings.advancedFeatures')}</h4>
        <div className="space-y-2 text-sm text-gray-500">
          <p>• {t('settings.conflictDetection')}</p>
          <p>• {t('settings.contextShortcuts')}</p>
          <p>• {t('settings.exportImportShortcuts')}</p>
          <p className="text-xs italic">{t('settings.comingSoon')}</p>
        </div>
      </div>
    </div>
  );
};
