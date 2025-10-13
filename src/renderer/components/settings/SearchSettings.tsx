/**
 * 검색 설정 탭
 */

import React from 'react';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useTranslation } from 'react-i18next';

export const SearchSettings: React.FC = () => {
  const { t } = useTranslation();
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
          {t('settings.maxResults')}: {searchSettings.maxResults}
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
          <span style={{ color: 'var(--color-text-secondary, #6b7280)' }}>10</span>
          <span style={{ color: 'var(--color-text-secondary, #6b7280)' }}>100</span>
          <span style={{ color: 'var(--color-text-secondary, #6b7280)' }}>500</span>
        </div>
      </div>

      {/* 검색 범위 */}
      <div>
        <label 
          className="block text-sm font-medium mb-3"
          style={{ color: 'var(--color-text-primary, #111827)' }}
        >
          {t('settings.searchScope')}
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span 
                className="text-sm"
                style={{ color: 'var(--color-text-primary, #111827)' }}
              >
                {t('settings.searchTitle')}
              </span>
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
                {t('settings.searchTags')}
              </span>
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
                {t('settings.searchContent')}
              </span>
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span 
                className="text-sm"
                style={{ color: 'var(--color-text-primary, #111827)' }}
              >
                {t('settings.highlightMatches')}
              </span>
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
          {t('settings.searchTips')}
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
            <span>{t('settings.searchTip1')}</span>
          </div>
          <div className="flex items-start space-x-2">
            <span 
              className="mt-0.5"
              style={{ color: 'var(--color-accent, #3b82f6)' }}
            >
              •
            </span>
            <span>{t('settings.searchTip2')}</span>
          </div>
        </div>
      </div>

      {/* 고급 검색 기능 (향후 확장용) - Phase 2 예정 기능이므로 주석 처리
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
      */}
    </div>
  );
};
