/**
 * LLM Badge
 * 
 * Badge indicator showing new LLM results for a specific prompt
 * Displayed on prompt items in the list view
 */

import React from 'react';
import { useLLMStore } from '@renderer/stores/useLLMStore';

interface LLMBadgeProps {
  promptId: string;
  className?: string;
}

export const LLMBadge: React.FC<LLMBadgeProps> = ({ promptId, className = '' }) => {
  const { getNewResultsCount } = useLLMStore();
  const count = getNewResultsCount(promptId);

  // Don't show if no new results
  if (count === 0) {
    return null;
  }

  return (
    <div 
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-green-500 text-white text-xs font-semibold rounded-full ${className}`}
      title={`${count} new response${count > 1 ? 's' : ''}`}
    >
      {count}
    </div>
  );
};

