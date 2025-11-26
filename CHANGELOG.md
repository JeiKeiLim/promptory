# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### UI/UX Polish (Feature 005)

- **Unified LLM Settings**: Combined LLM call and title generation settings into a single tab
  - Single provider dropdown shared for both LLM call and title generation
  - Separate model name and timeout configuration for each function
  - Inline validation with 3-digit timeout limits (1-999 seconds)
  - Default timeout: 60s for LLM call, 30s for title generation
  - Multi-language support (English, Korean, Japanese)
  - WCAG 2.1 Level AA accessibility compliance
  
- **Always-Visible Favorite Toggle**: Improved favorite management on prompt cards
  - Favorite star button now always visible on all prompt cards
  - Visual states: filled yellow star (favorited) / empty gray star (not favorited)
  - 300ms debouncing prevents rapid-click issues
  - Optimistic UI updates with automatic rollback on failure
  - Error notifications via toast for failed operations
  
- **Shortcut List Spacing**: Enhanced visual hierarchy in settings
  - Added 16px left and right padding to shortcut list
  - Improved readability and breathing room
  - Consistent spacing across all settings tabs
  
- **Streamlined Modal Closing**: Simplified prompt use modal UX
  - Removed redundant Cancel button from ParameterInputModal footer
  - Modal closes via X icon, ESC key, or backdrop click
  - Cleaner, more modern interface aligned with industry standards

### Changed

- **LLM Settings UI**: Merged Title Generation Settings tab into unified LLM Settings tab
- **Favorite Toggle Behavior**: Stars are now always visible instead of only when favorited
- **Configuration Migration**: Old LLM config format automatically migrated to new unified format

### Removed

- **TitleGenerationSettings Component**: Functionality merged into unified LLMSettings component
- **Cancel Button**: Removed from ParameterInputModal (redundant with X icon)

### Technical Improvements

- Added reusable validation utilities (`validation.ts`)
- Created custom React hook for debounced favorite toggle (`useDebouncedFavoriteToggle.ts`)
- Implemented atomic file operations for configuration and YAML updates
- Enhanced IPC layer with new unified config handlers
- Added comprehensive TypeScript types for unified LLM configuration
- Extracted FavoriteStar as reusable component

### Developer Experience

- Added 8 new source files (~1,488 lines)
- Modified 11 existing files with surgical precision
- Maintained 100% TypeScript strict mode compliance
- Added 2 new passing tests (329 vs 327 baseline)
- All builds pass with zero TypeScript errors

---

## Previous Releases

_(No previous releases documented)_
