import React from 'react';
import type { AppSettings } from '@renderer/stores/useAppStore';

/**
 * Options for highlighting text
 */
export interface HighlightOptions {
  /** CSS classes to apply to highlighted text */
  highlightClassName?: string;
  /** Whether to perform case-sensitive matching (default: false) */
  caseSensitive?: boolean;
}

/**
 * Result of checking whether highlighting should be applied
 */
export interface ShouldHighlightResult {
  /** Whether highlighting should be applied */
  shouldHighlight: boolean;
  /** Reason why highlighting is disabled (for debugging) */
  reason?: 'no-query' | 'search-inactive' | 'setting-disabled' | 'scope-disabled';
}

/**
 * Escapes special regex characters in a string
 * 
 * @param str - String to escape
 * @returns Escaped string safe for RegExp
 * 
 * @internal
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlights matching portions of text with <mark> elements
 * 
 * @param text - The text to highlight
 * @param query - The search query to match
 * @param options - Optional highlighting configuration
 * @returns Array of React nodes (strings and <mark> elements)
 * 
 * @example
 * ```tsx
 * highlightText('JavaScript', 'script')
 * // Returns: ['Java', <mark>script</mark>]
 * ```
 */
export function highlightText(
  text: string,
  query: string,
  options?: HighlightOptions
): React.ReactNode[] {
  // Validation
  if (!text) return [''];
  if (!query || query.trim().length === 0) return [text];
  
  try {
    const className = options?.highlightClassName || 'bg-yellow-200 text-yellow-900 px-1 rounded';
    const flags = options?.caseSensitive ? 'g' : 'gi';
    const escapedQuery = escapeRegex(query.trim());
    const regex = new RegExp(`(${escapedQuery})`, flags);
    
    const parts = text.split(regex);
    
    // If no matches found, return plain text
    if (parts.length === 1) {
      return [text];
    }
    
    return parts
      .filter(part => part.length > 0) // Remove empty strings from split
      .map((part, index) => {
        // Test if this part matches the pattern
        // Need to reset regex for each test
        const testRegex = new RegExp(`^${escapedQuery}$`, flags);
        if (testRegex.test(part)) {
          return (
            <mark key={index} className={className}>
              {part}
            </mark>
          );
        }
        return part;
      });
  } catch (error) {
    console.warn('Failed to highlight text:', error);
    return [text]; // Fallback to plain text
  }
}

/**
 * Determines whether tag highlighting should be applied
 * based on search state and user settings
 * 
 * @param isSearchActive - Whether a search is currently active
 * @param settings - Application settings object
 * @param query - Current search query
 * @returns Object indicating whether to highlight and why
 * 
 * @example
 * ```ts
 * const result = shouldHighlightTags(true, settings, 'api');
 * if (result.shouldHighlight) {
 *   // Apply highlighting
 * }
 * ```
 */
export function shouldHighlightTags(
  isSearchActive: boolean,
  settings: AppSettings | undefined,
  query: string
): ShouldHighlightResult {
  // Check if query is empty
  if (!query || query.trim().length === 0) {
    return { shouldHighlight: false, reason: 'no-query' };
  }
  
  // Check if search is active
  if (!isSearchActive) {
    return { shouldHighlight: false, reason: 'search-inactive' };
  }
  
  // Check highlight setting (default: enabled if undefined)
  const highlightEnabled = settings?.search?.highlightMatches !== false;
  if (!highlightEnabled) {
    return { shouldHighlight: false, reason: 'setting-disabled' };
  }
  
  // Check if tags are in search scope (default: enabled if undefined)
  const tagsInScope = settings?.search?.searchScope?.tags !== false;
  if (!tagsInScope) {
    return { shouldHighlight: false, reason: 'scope-disabled' };
  }
  
  return { shouldHighlight: true };
}

