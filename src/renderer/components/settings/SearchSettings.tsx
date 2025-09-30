/**
 * 검색 설정 탭
 */

import React from 'react';
import { useAppStore } from '@renderer/stores/useAppStore';

export const SearchSettings: React.FC = () => {
  const { settings, updateSettings } = useAppStore();

  // 안전한 기본값 설정
  const searchSettings = settings.search || {
    maxResults: 100,
    highlightMatches: true,
    caseSensitive: false,
    searchScope: {
      title: true,
      tags: true,
      content: true
    }
  };

  const handleMaxResultsChange = (maxResults: number) => {
    updateSettings({
      search: { ...searchSettings, maxResults }
    });
  };

  const handleHighlightMatchesChange = (highlightMatches: boolean) => {
    updateSettings({
      search: { ...searchSettings, highlightMatches }
    });
  };

  const handleCaseSensitiveChange = (caseSensitive: boolean) => {
    updateSettings({
      search: { ...searchSettings, caseSensitive }
    });
  };

  const handleSearchScopeChange = (scope: keyof typeof searchSettings.searchScope, value: boolean) => {
    updateSettings({
      search: {
        ...searchSettings,
        searchScope: {
          ...searchSettings.searchScope,
          [scope]: value
        }
      }
    });
  };

  return (
    <div className="space-y-6" style={{ color: 'var(--color-text-primary, #111827)' }}>
      {/* 최대 검색 결과 수 */}
      <div>
        <label 
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--color-text-primary, #111827)' }}
        >
          최대 검색 결과: {searchSettings.maxResults}개
        </label>
        <input
          type="range"
          min="10"
          max="500"
          step="10"
          value={searchSettings.maxResults}
          onChange={(e) => handleMaxResultsChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
          style={{
            backgroundColor: 'var(--color-border-primary, #e5e7eb)'
          }}
        />
        <div className="flex justify-between text-xs mt-1">
          <span style={{ color: 'var(--color-text-secondary, #6b7280)' }}>10개</span>
          <span style={{ color: 'var(--color-text-secondary, #6b7280)' }}>100개</span>
          <span style={{ color: 'var(--color-text-secondary, #6b7280)' }}>500개</span>
        </div>
        <p 
          className="text-xs mt-2"
          style={{ color: 'var(--color-text-secondary, #6b7280)' }}
        >
          검색 결과가 많을 경우 성능에 영향을 줄 수 있습니다
        </p>
      </div>

      {/* 검색 범위 */}
      <div>
        <label 
          className="block text-sm font-medium mb-3"
          style={{ color: 'var(--color-text-primary, #111827)' }}
        >
          검색 범위
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span 
                className="text-sm"
                style={{ color: 'var(--color-text-primary, #111827)' }}
              >
                제목
              </span>
              <p 
                className="text-xs"
                style={{ color: 'var(--color-text-secondary, #6b7280)' }}
              >
                프롬프트 제목에서 검색
              </p>
            </div>
            <input
              type="checkbox"
              checked={searchSettings.searchScope.title}
              onChange={(e) => handleSearchScopeChange('title', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              style={{
                borderColor: 'var(--color-border-primary, #d1d5db)',
                backgroundColor: 'var(--color-bg-primary, #ffffff)'
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span 
                className="text-sm"
                style={{ color: 'var(--color-text-primary, #111827)' }}
              >
                태그
              </span>
              <p 
                className="text-xs"
                style={{ color: 'var(--color-text-secondary, #6b7280)' }}
              >
                프롬프트 태그에서 검색
              </p>
            </div>
            <input
              type="checkbox"
              checked={searchSettings.searchScope.tags}
              onChange={(e) => handleSearchScopeChange('tags', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              style={{
                borderColor: 'var(--color-border-primary, #d1d5db)',
                backgroundColor: 'var(--color-bg-primary, #ffffff)'
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span 
                className="text-sm"
                style={{ color: 'var(--color-text-primary, #111827)' }}
              >
                내용
              </span>
              <p 
                className="text-xs"
                style={{ color: 'var(--color-text-secondary, #6b7280)' }}
              >
                프롬프트 본문에서 검색
              </p>
            </div>
            <input
              type="checkbox"
              checked={searchSettings.searchScope.content}
              onChange={(e) => handleSearchScopeChange('content', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              style={{
                borderColor: 'var(--color-border-primary, #d1d5db)',
                backgroundColor: 'var(--color-bg-primary, #ffffff)'
              }}
            />
          </div>
        </div>
      </div>

      {/* 검색 옵션 */}
      <div>
        <label 
          className="block text-sm font-medium mb-3"
          style={{ color: 'var(--color-text-primary, #111827)' }}
        >
          검색 옵션
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span 
                className="text-sm"
                style={{ color: 'var(--color-text-primary, #111827)' }}
              >
                대소문자 구분
              </span>
              <p 
                className="text-xs"
                style={{ color: 'var(--color-text-secondary, #6b7280)' }}
              >
                검색 시 대소문자를 구분합니다
              </p>
            </div>
            <input
              type="checkbox"
              checked={searchSettings.caseSensitive}
              onChange={(e) => handleCaseSensitiveChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              style={{
                borderColor: 'var(--color-border-primary, #d1d5db)',
                backgroundColor: 'var(--color-bg-primary, #ffffff)'
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span 
                className="text-sm"
                style={{ color: 'var(--color-text-primary, #111827)' }}
              >
                검색어 하이라이트
              </span>
              <p 
                className="text-xs"
                style={{ color: 'var(--color-text-secondary, #6b7280)' }}
              >
                검색 결과에서 검색어를 강조 표시합니다
              </p>
            </div>
            <input
              type="checkbox"
              checked={searchSettings.highlightMatches}
              onChange={(e) => handleHighlightMatchesChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              style={{
                borderColor: 'var(--color-border-primary, #d1d5db)',
                backgroundColor: 'var(--color-bg-primary, #ffffff)'
              }}
            />
          </div>
        </div>
      </div>

      {/* 검색 성능 팁 */}
      <div 
        className="border-t pt-6"
        style={{ borderColor: 'var(--color-border-primary, #e5e7eb)' }}
      >
        <h4 
          className="text-sm font-medium mb-3"
          style={{ color: 'var(--color-text-primary, #111827)' }}
        >
          검색 성능 팁
        </h4>
        <div 
          className="space-y-2 text-sm"
          style={{ color: 'var(--color-text-secondary, #6b7280)' }}
        >
          <div className="flex items-start space-x-2">
            <span 
              className="mt-0.5"
              style={{ color: 'var(--color-accent, #3b82f6)' }}
            >
              •
            </span>
            <span>검색 범위를 줄이면 더 빠른 검색이 가능합니다</span>
          </div>
          <div className="flex items-start space-x-2">
            <span 
              className="mt-0.5"
              style={{ color: 'var(--color-accent, #3b82f6)' }}
            >
              •
            </span>
            <span>최대 결과 수를 줄이면 메모리 사용량이 감소합니다</span>
          </div>
          <div className="flex items-start space-x-2">
            <span 
              className="mt-0.5"
              style={{ color: 'var(--color-accent, #3b82f6)' }}
            >
              •
            </span>
            <span>대소문자 구분을 비활성화하면 더 많은 결과를 찾을 수 있습니다</span>
          </div>
        </div>
      </div>

      {/* 고급 검색 기능 (향후 확장용) */}
      <div 
        className="border-t pt-6"
        style={{ borderColor: 'var(--color-border-primary, #e5e7eb)' }}
      >
        <h4 
          className="text-sm font-medium mb-3"
          style={{ color: 'var(--color-text-primary, #111827)' }}
        >
          고급 검색 기능
        </h4>
        <div 
          className="space-y-2 text-sm"
          style={{ color: 'var(--color-text-secondary, #6b7280)' }}
        >
          <p>• 정규식 검색</p>
          <p>• 저장된 검색 쿼리</p>
          <p>• 검색 히스토리</p>
          <p>• 고급 필터 조합</p>
          <p 
            className="text-xs italic"
            style={{ color: 'var(--color-text-secondary, #6b7280)' }}
          >
            이 기능들은 Phase 2에서 구현될 예정입니다.
          </p>
        </div>
      </div>
    </div>
  );
};
