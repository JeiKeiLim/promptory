/**
 * FavoriteStar Component (T082-T090)
 * 
 * Always-visible star toggle for favoriting prompts.
 * Features: optimistic UI, debounced persistence, accessibility.
 */

import React from 'react';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

export interface FavoriteStarProps {
  promptId: string;
  isFavorite: boolean;
  onToggle: (promptId: string, currentState: boolean) => void;
}

/**
 * FavoriteStar Component
 * 
 * Displays a star icon that toggles favorite status.
 * - Empty star (outline) when not favorited
 * - Filled star (solid) when favorited
 * - Accessible via keyboard (Tab + Enter/Space)
 * - Prevents click propagation to parent elements
 */
export const FavoriteStar: React.FC<FavoriteStarProps> = ({
  promptId,
  isFavorite,
  onToggle,
}) => {
  // T086: Click handler that calls onToggle
  // T087: Stops propagation to prevent parent click handlers
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(promptId, isFavorite);
  };

  // T088: Aria-label for accessibility
  const ariaLabel = isFavorite ? 'Remove from favorites' : 'Add to favorites';

  return (
    <button
      onClick={handleClick}
      className="p-1 rounded-md hover:bg-gray-100 transition-colors" // T090: Hover effect
      aria-label={ariaLabel} // T088
      aria-pressed={isFavorite} // T089: Aria-pressed reflects state
      type="button"
    >
      {isFavorite ? (
        // T085: Filled star with yellow colors
        <StarIconSolid 
          className="w-5 h-5 fill-yellow-400 stroke-yellow-500"
          aria-hidden="true"
        />
      ) : (
        // T085: Empty star with gray colors
        <StarIcon 
          className="w-5 h-5 fill-none stroke-gray-400"
          aria-hidden="true"
        />
      )}
    </button>
  );
};
