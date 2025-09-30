/**
 * 에디터 설정 탭
 */

import React from 'react';
import { useAppStore } from '@renderer/stores/useAppStore';

export const EditorSettings: React.FC = () => {
  const { settings, updateSettings } = useAppStore();

  // 안전한 기본값 설정
  const editorSettings = settings.editor || {
    wordWrap: true,
    showLineNumbers: false,
    tabSize: 2,
    fontFamily: "Monaco, 'Cascadia Code', 'Fira Code', monospace"
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

  const handleTabSizeChange = (tabSize: 2 | 4 | 8) => {
    updateSettings({
      editor: { ...editorSettings, tabSize }
    });
  };

  const handleFontFamilyChange = (fontFamily: string) => {
    updateSettings({
      editor: { ...editorSettings, fontFamily }
    });
  };

  const fontOptions = [
    { value: "Monaco, 'Cascadia Code', 'Fira Code', monospace", label: 'Monaco (기본)' },
    { value: "'Fira Code', 'Cascadia Code', Monaco, monospace", label: 'Fira Code' },
    { value: "'Cascadia Code', 'Fira Code', Monaco, monospace", label: 'Cascadia Code' },
    { value: "'JetBrains Mono', Monaco, monospace", label: 'JetBrains Mono' },
    { value: "'Source Code Pro', Monaco, monospace", label: 'Source Code Pro' },
    { value: "Consolas, Monaco, monospace", label: 'Consolas' },
    { value: "'SF Mono', Monaco, monospace", label: 'SF Mono' }
  ];

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
              워드랩 (줄 바꿈)
            </label>
            <p 
              className="text-xs"
              style={{ color: 'var(--color-text-secondary, #6b7280)' }}
            >
              긴 줄을 자동으로 다음 줄로 넘깁니다
            </p>
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
              줄 번호 표시
            </label>
            <p 
              className="text-xs"
              style={{ color: 'var(--color-text-secondary, #6b7280)' }}
            >
              에디터 왼쪽에 줄 번호를 표시합니다
            </p>
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

      {/* 탭 크기 */}
      <div>
        <label 
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--color-text-primary, #111827)' }}
        >
          탭 크기
        </label>
        <div className="space-y-2">
          {[2, 4, 8].map((size) => (
            <label key={size} className="flex items-center space-x-3">
              <input
                type="radio"
                name="tabSize"
                value={size}
                checked={editorSettings.tabSize === size}
                onChange={() => handleTabSizeChange(size as any)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                style={{
                  borderColor: 'var(--color-border-primary, #d1d5db)',
                  backgroundColor: 'var(--color-bg-primary, #ffffff)'
                }}
              />
              <span 
                className="text-sm"
                style={{ color: 'var(--color-text-primary, #111827)' }}
              >
                {size} 스페이스
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* 폰트 패밀리 */}
      <div>
        <label 
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--color-text-primary, #111827)' }}
        >
          폰트 패밀리
        </label>
        <select
          value={editorSettings.fontFamily}
          onChange={(e) => handleFontFamilyChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          style={{
            backgroundColor: 'var(--color-bg-primary, #ffffff)',
            borderColor: 'var(--color-border-primary, #e5e7eb)',
            color: 'var(--color-text-primary, #111827)'
          }}
        >
          {fontOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* 폰트 미리보기 */}
        <div 
          className="mt-3 p-3 rounded-md border"
          style={{ 
            backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
            borderColor: 'var(--color-border-primary, #e5e7eb)'
          }}
        >
          <p 
            className="text-xs mb-2"
            style={{ color: 'var(--color-text-secondary, #6b7280)' }}
          >
            미리보기:
          </p>
          <div
            className="text-sm"
            style={{ 
              fontFamily: editorSettings.fontFamily,
              color: 'var(--color-text-primary, #111827)'
            }}
          >
            <div>const greeting = "Hello, World!";</div>
            <div>function fibonacci(n) &#123;</div>
            <div>&nbsp;&nbsp;return n &lt;= 1 ? n : fibonacci(n-1) + fibonacci(n-2);</div>
            <div>&#125;</div>
          </div>
        </div>
      </div>

      {/* 에디터 테마 (향후 확장용) */}
      <div 
        className="border-t pt-6"
        style={{ borderColor: 'var(--color-border-primary, #e5e7eb)' }}
      >
        <h4 
          className="text-sm font-medium mb-3"
          style={{ color: 'var(--color-text-primary, #111827)' }}
        >
          고급 설정
        </h4>
        <div 
          className="space-y-3 text-sm"
          style={{ color: 'var(--color-text-secondary, #6b7280)' }}
        >
          <p>• 에디터 테마 설정</p>
          <p>• 구문 강조 색상</p>
          <p>• 자동 완성 설정</p>
          <p 
            className="text-xs italic"
            style={{ color: 'var(--color-text-secondary, #6b7280)' }}
          >
            이 기능들은 향후 업데이트에서 제공될 예정입니다.
          </p>
        </div>
      </div>
    </div>
  );
};
