/**
 * 단축키 설정 탭
 */

import React, { useState } from 'react';
import { useAppStore } from '@renderer/stores/useAppStore';

interface ShortcutInputProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

const ShortcutInput: React.FC<ShortcutInputProps> = ({ label, description, value, onChange }) => {
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
    ? (currentKeys.length > 0 ? currentKeys.join(' + ') : '키를 입력하세요...')
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
            취소
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
            변경
          </button>
        )}
      </div>
    </div>
  );
};

export const ShortcutSettings: React.FC = () => {
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
    if (confirm('모든 단축키를 기본값으로 되돌리시겠습니까?')) {
      resetSettings();
    }
  };

  const shortcutList = [
    {
      key: 'newPrompt' as const,
      label: '새 프롬프트',
      description: '새로운 프롬프트를 생성합니다'
    },
    {
      key: 'search' as const,
      label: '검색',
      description: '검색창에 포커스를 맞춥니다'
    },
    {
      key: 'editPrompt' as const,
      label: '편집 모드',
      description: '선택된 프롬프트를 편집 모드로 전환합니다'
    },
    {
      key: 'usePrompt' as const,
      label: '프롬프트 사용',
      description: '파라미터 입력 모달을 엽니다'
    },
    {
      key: 'toggleFavorite' as const,
      label: '즐겨찾기 토글',
      description: '선택된 프롬프트의 즐겨찾기를 토글합니다'
    },
    {
      key: 'copyContent' as const,
      label: '내용 복사',
      description: '프롬프트 내용을 클립보드에 복사합니다'
    },
    {
      key: 'refresh' as const,
      label: '새로고침',
      description: '프롬프트 목록을 새로고침합니다'
    },
    {
      key: 'showHelp' as const,
      label: '도움말',
      description: '단축키 도움말을 표시합니다'
    },
    {
      key: 'exitEdit' as const,
      label: '편집 종료',
      description: '편집 모드를 종료합니다'
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
            키보드 단축키
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
            기본값 복원
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
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
        <h4 className="text-sm font-medium text-gray-700 mb-3">단축키 사용법</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>단축키를 변경하려면 "변경" 버튼을 클릭하고 새로운 키 조합을 입력하세요</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Cmd (macOS) 또는 Ctrl (Windows/Linux) + 다른 키 조합을 사용하세요</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Shift, Alt 키도 함께 사용할 수 있습니다</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>이미 사용 중인 단축키는 자동으로 감지되어 경고됩니다</span>
          </div>
        </div>
      </div>

      {/* 충돌 감지 (향후 구현) */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">고급 기능</h4>
        <div className="space-y-2 text-sm text-gray-500">
          <p>• 단축키 충돌 자동 감지</p>
          <p>• 컨텍스트별 단축키 설정</p>
          <p>• 단축키 내보내기/가져오기</p>
          <p className="text-xs italic">이 기능들은 향후 업데이트에서 제공될 예정입니다.</p>
        </div>
      </div>
    </div>
  );
};
