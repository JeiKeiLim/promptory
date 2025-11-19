import { describe, it, expect } from 'vitest';
import { isValidElement } from 'react';
import { highlightText, shouldHighlightTags } from '@renderer/utils/tagHighlighter';
import type { AppSettings } from '@renderer/stores/useAppStore';

describe('tagHighlighter', () => {
  describe('highlightText', () => {
    // T005: Exact match highlighting
    it('should highlight exact match', () => {
      const result = highlightText('API', 'API');
      
      expect(result).toHaveLength(1);
      expect(isValidElement(result[0])).toBe(true);
      const element = result[0] as React.ReactElement;
      expect(element.type).toBe('mark');
      expect(element.props.children).toBe('API');
      expect(element.props.className).toContain('bg-yellow-200');
    });

    // T006: Partial match highlighting
    it('should highlight partial match', () => {
      const result = highlightText('JavaScript', 'script');
      
      expect(result.length).toBeGreaterThan(1);
      // Should have: 'Java', <mark>Script</mark>
      expect(typeof result[0]).toBe('string');
      expect(result[0]).toBe('Java');
      expect(isValidElement(result[1])).toBe(true);
      const element = result[1] as React.ReactElement;
      expect(element.type).toBe('mark');
      expect(element.props.children).toBe('Script');
    });

    it('should highlight partial match at start of string', () => {
      const result = highlightText('JavaScript', 'Java');
      
      expect(result.length).toBeGreaterThan(1);
      expect(isValidElement(result[0])).toBe(true);
      const element = result[0] as React.ReactElement;
      expect(element.props.children).toBe('Java');
    });

    // T007: Case-insensitive matching
    it('should be case insensitive by default - lowercase query matches uppercase tag', () => {
      const result = highlightText('API', 'api');
      
      expect(result).toHaveLength(1);
      expect(isValidElement(result[0])).toBe(true);
      const element = result[0] as React.ReactElement;
      expect(element.props.children).toBe('API');
    });

    it('should be case insensitive - uppercase query matches lowercase tag', () => {
      const result = highlightText('javascript', 'SCRIPT');
      
      expect(result.length).toBeGreaterThan(1);
      const markIndex = result.findIndex(el => isValidElement(el));
      expect(markIndex).toBeGreaterThan(-1);
      const element = result[markIndex] as React.ReactElement;
      expect(element.props.children).toBe('script');
    });

    it('should be case insensitive - mixed case query', () => {
      const result = highlightText('JavaScript', 'JaVaScRiPt');
      
      expect(result).toHaveLength(1);
      expect(isValidElement(result[0])).toBe(true);
      const element = result[0] as React.ReactElement;
      expect(element.props.children).toBe('JavaScript');
    });

    // T008: Special characters in query
    it('should handle special characters in query without regex errors', () => {
      const result = highlightText('test()', 'test()');
      
      expect(result).toHaveLength(1);
      expect(isValidElement(result[0])).toBe(true);
      const element = result[0] as React.ReactElement;
      expect(element.props.children).toBe('test()');
    });

    it('should escape regex special characters like dots', () => {
      const result = highlightText('Node.js', 'Node.js');
      
      expect(result).toHaveLength(1);
      expect(isValidElement(result[0])).toBe(true);
      const element = result[0] as React.ReactElement;
      expect(element.props.children).toBe('Node.js');
    });

    it('should escape regex special characters like brackets', () => {
      const result = highlightText('test[1]', 'test[1]');
      
      expect(result).toHaveLength(1);
      expect(isValidElement(result[0])).toBe(true);
      const element = result[0] as React.ReactElement;
      expect(element.props.children).toBe('test[1]');
    });

    // T009: Empty query
    it('should return plain text for empty query', () => {
      const result = highlightText('API', '');
      expect(result).toEqual(['API']);
    });

    it('should return plain text for whitespace-only query', () => {
      const result = highlightText('API', '   ');
      expect(result).toEqual(['API']);
    });

    // T010: Multiple matches in one tag
    it('should highlight multiple matches in one tag', () => {
      const result = highlightText('test-test-test', 'test');
      
      // Should have multiple <mark> elements
      const marks = result.filter(el => isValidElement(el));
      expect(marks.length).toBe(3);
      marks.forEach(mark => {
        const element = mark as React.ReactElement;
        expect(element.props.children).toBe('test');
      });
    });

    it('should highlight multiple non-adjacent matches', () => {
      const result = highlightText('JavaScript for WebScripting', 'script');
      
      const marks = result.filter(el => isValidElement(el));
      expect(marks.length).toBe(2);
    });

    // Additional edge cases
    it('should return empty string for empty text', () => {
      const result = highlightText('', 'query');
      expect(result).toEqual(['']);
    });

    it('should handle no matches gracefully', () => {
      const result = highlightText('JavaScript', 'python');
      expect(result).toEqual(['JavaScript']);
    });

    it('should apply custom className', () => {
      const result = highlightText('API', 'API', { 
        highlightClassName: 'custom-highlight' 
      });
      
      expect(result).toHaveLength(1);
      expect(isValidElement(result[0])).toBe(true);
      const element = result[0] as React.ReactElement;
      expect(element.props.className).toBe('custom-highlight');
    });

    it('should use default className when not specified', () => {
      const result = highlightText('API', 'API');
      
      expect(result).toHaveLength(1);
      expect(isValidElement(result[0])).toBe(true);
      const element = result[0] as React.ReactElement;
      expect(element.props.className).toContain('bg-yellow-200');
      expect(element.props.className).toContain('text-yellow-900');
    });
  });

  describe('shouldHighlightTags', () => {
    const createSettings = (overrides?: Partial<AppSettings>): AppSettings => ({
      search: {
        highlightMatches: true,
        searchScope: { 
          title: true, 
          tags: true, 
          content: false 
        }
      },
      ...overrides
    });

    // T011: Check all conditions
    it('should return true when all conditions are met', () => {
      const settings = createSettings();
      const result = shouldHighlightTags(true, settings, 'api');
      
      expect(result.shouldHighlight).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return false when query is empty', () => {
      const settings = createSettings();
      const result = shouldHighlightTags(true, settings, '');
      
      expect(result.shouldHighlight).toBe(false);
      expect(result.reason).toBe('no-query');
    });

    it('should return false when query is whitespace only', () => {
      const settings = createSettings();
      const result = shouldHighlightTags(true, settings, '   ');
      
      expect(result.shouldHighlight).toBe(false);
      expect(result.reason).toBe('no-query');
    });

    it('should return false when search is inactive', () => {
      const settings = createSettings();
      const result = shouldHighlightTags(false, settings, 'api');
      
      expect(result.shouldHighlight).toBe(false);
      expect(result.reason).toBe('search-inactive');
    });

    it('should return false when highlightMatches setting is disabled', () => {
      const settings = createSettings({
        search: {
          highlightMatches: false,
          searchScope: { title: true, tags: true, content: false }
        }
      });
      const result = shouldHighlightTags(true, settings, 'api');
      
      expect(result.shouldHighlight).toBe(false);
      expect(result.reason).toBe('setting-disabled');
    });

    it('should return false when tag search scope is disabled', () => {
      const settings = createSettings({
        search: {
          highlightMatches: true,
          searchScope: { title: true, tags: false, content: false }
        }
      });
      const result = shouldHighlightTags(true, settings, 'api');
      
      expect(result.shouldHighlight).toBe(false);
      expect(result.reason).toBe('scope-disabled');
    });

    it('should use default values when settings are undefined', () => {
      const result = shouldHighlightTags(true, undefined, 'api');
      
      // Default behavior: highlighting enabled when settings undefined
      expect(result.shouldHighlight).toBe(true);
    });

    it('should use default values when search settings are undefined', () => {
      const result = shouldHighlightTags(true, {} as AppSettings, 'api');
      
      // Default behavior: highlighting enabled
      expect(result.shouldHighlight).toBe(true);
    });

    // T011.5: Real-time behavior test
    it('should respect existing debounce behavior - updates with new query', () => {
      const settings = createSettings();
      
      // Simulate typing sequence (debounce happens in SearchBar component)
      const result1 = shouldHighlightTags(true, settings, 'a');
      expect(result1.shouldHighlight).toBe(true);
      
      const result2 = shouldHighlightTags(true, settings, 'ap');
      expect(result2.shouldHighlight).toBe(true);
      
      const result3 = shouldHighlightTags(true, settings, 'api');
      expect(result3.shouldHighlight).toBe(true);
      
      // Cleared search
      const result4 = shouldHighlightTags(false, settings, '');
      expect(result4.shouldHighlight).toBe(false);
    });
  });
});
