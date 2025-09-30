/**
 * 검색바 컴포넌트 (Fuse.js 기반 퍼지 검색)
 */

import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { usePromptStore } from '@renderer/stores/usePromptStore';
import type { PromptFileInfo } from '@shared/types/prompt';

interface SearchBarProps {
  onSearchResults?: (results: PromptFileInfo[], hasQuery: boolean, query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearchResults }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const { prompts } = usePromptStore();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const onSearchResultsRef = useRef(onSearchResults);

  // 최신 콜백 함수 업데이트
  useEffect(() => {
    onSearchResultsRef.current = onSearchResults;
  }, [onSearchResults]);

  // Fuse.js 설정
  const fuse = React.useMemo(() => {
    const options = {
      keys: [
        { name: 'metadata.title', weight: 0.4 },
        { name: 'metadata.description', weight: 0.3 },
        { name: 'metadata.tags', weight: 0.2 },
        { name: 'path', weight: 0.1 }
      ],
      threshold: 0.3, // 0 = 완전 일치, 1 = 모든 것 일치
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2
    };
    
    return new Fuse(prompts, options);
  }, [prompts]);

  // 검색 실행
  const performSearch = React.useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      onSearchResultsRef.current?.([], false, ''); // 검색어가 없음을 알림
      return;
    }

    setIsSearching(true);
    
    // 디바운싱을 위한 타이머
    const timer = setTimeout(() => {
      const results = fuse.search(searchQuery);
      const items = results.map(result => result.item);
      
      setIsSearching(false);
      onSearchResultsRef.current?.(items, true, searchQuery); // 검색어가 있음을 알림
    }, 300);

    return () => clearTimeout(timer);
  }, [fuse]);

  // 검색어 변경 처리
  useEffect(() => {
    const cleanup = performSearch(query);
    return cleanup;
  }, [query, performSearch]);


  // 키보드 단축키 (Cmd+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      if (e.key === 'Escape') {
        setQuery('');
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);


  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="프롬프트 검색... (Cmd+F)"
          className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        {/* 검색 아이콘 */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          ) : (
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        {/* 검색 결과 지우기 버튼 */}
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsSearching(false);
              searchInputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

    </div>
  );
};

