# Feature Specification: UI/UX Polish

**Feature Branch**: `005-ui-ux-polish`  
**Created**: 2025-11-26  
**Status**: Draft  
**Input**: User description: "I want to polish UI/UX.

## Clarifications

### Session 2025-11-26

- Q: When a user enters invalid timeout values (zero or negative), should the system allow saving with warnings, prevent save with inline error, auto-correct to valid value, or reset to previous configuration? → A: Show inline validation error and prevent save until corrected
- Q: When a user selects a provider but leaves model fields empty, should the system require both fields, allow saving with warning, use default model, or require only one field? → A: Require both model fields before saving
- Q: When a user rapidly clicks the star icon multiple times, should the system process each click immediately, debounce clicks, disable icon temporarily, or queue all clicks? → A: Debounce clicks, only process final state after short delay
- Q: When network connectivity is lost and a favorite toggle cannot be persisted, should the system block UI, retry automatically with notification, drop change silently, store locally for auto-sync, or update UI optimistically with immediate error notification and no automatic retries? → A: Update UI optimistically, show error notification immediately on failure, no automatic retries (user manually retries if needed)
- Q: What are the valid timeout value ranges (minimum and maximum) for LLM call and title generation timeout fields? → A: Minimum 1 second, maximum 999 seconds (3 digits for UI consistency)
- Q: Where should the always-visible star icon be positioned on each prompt card? → A: Top-right corner of the card
- Q: What specific left and right margin values should be applied to the shortcut list? → A: 16px
- Q: What should the default timeout values be when users first configure LLM settings? → A: 60 seconds for LLM call, 30 seconds for LLM title generation
- Q: When the prompt use modal is open, should clicking outside the modal close it? → A: Yes, clicking outside closes the modal
- Q: How should the unified LLM settings be visually organized within the single tab? → A: Single-column layout with provider at top, then two sections (LLM Call / Title Generation) each containing model and timeout fields

# Settings

1. LLM calls and LLM title generation settings should be combined into single tab.
1.1. For now, Only single provider can be chosen for both LLM call and LLM title generation
1.2. Model name can be set separately on LLM call and LLM title generation
1.3. Timeout also should be set separately
1.4. In LLM call setting, I don't see the point of Display Name for the model since the provider name will not be shown in anywhere.
2. In the shortcut setting, the list view of shortcut has no margin on left and right which should

# Prompt use modal
1. It already has x icon for closing the model so there is no point having cancel button at the bottom.

# Main UI
1. The list of prompt card should have favorite button. Currently it only shows when the prompt is favorite. Exposing empty star button that function as toggling favorite status will help the user to organize favorites better"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified LLM Settings Configuration (Priority: P1)

Users configure LLM settings in a single, consolidated location where they select one provider for both LLM calls and title generation, while maintaining flexibility to specify different models and timeouts for each function.

**Why this priority**: Simplifies the most critical configuration workflow and reduces cognitive load by eliminating redundant settings across multiple tabs.

**Independent Test**: Can be fully tested by navigating to settings, selecting a provider, configuring separate models and timeouts for LLM calls and title generation, and verifying the configuration persists and functions correctly.

**Acceptance Scenarios**:

1. **Given** the user opens settings, **When** they navigate to the LLM tab, **Then** they see a single-column layout with provider selection at the top, followed by two clearly separated sections: "LLM Call Settings" (with model and timeout fields) and "Title Generation Settings" (with model and timeout fields)
2. **Given** the user selects a provider (e.g., OpenAI), **When** they configure different models for LLM calls and title generation, **Then** both configurations are saved and applied to their respective functions
3. **Given** the user sets different timeout values, **When** they save and test both functions, **Then** each function respects its configured timeout independently
4. **Given** the user has configured LLM settings, **When** they close and reopen settings, **Then** all configurations persist correctly
5. **Given** the unified settings tab exists, **When** the user looks at LLM call settings, **Then** the Display Name field is removed as it serves no purpose

---

### User Story 2 - Always-Visible Favorite Toggle (Priority: P1)

Users can favorite or unfavorite any prompt directly from the main prompt list by clicking a star icon that is always visible, regardless of the prompt's current favorite status.

**Why this priority**: Dramatically improves discoverability and organization efficiency by making the favorite action always accessible, rather than hidden for non-favorited items.

**Independent Test**: Can be fully tested by viewing the prompt list, clicking star icons on various prompts to toggle favorite status, and verifying the changes persist and affect filtering behavior.

**Acceptance Scenarios**:

1. **Given** the user views the prompt list, **When** they look at any prompt card, **Then** they see a star icon in the top-right corner (filled for favorited prompts, empty for non-favorited prompts)
2. **Given** a prompt is not favorited (empty star), **When** the user clicks the star icon, **Then** the prompt becomes favorited and the star fills in
3. **Given** a prompt is favorited (filled star), **When** the user clicks the star icon, **Then** the prompt becomes unfavorited and the star becomes empty
4. **Given** the user toggles favorite status, **When** they navigate away and return, **Then** the favorite status persists correctly
5. **Given** the user filters by favorites, **When** they toggle a favorite status, **Then** the prompt list updates appropriately

---

### User Story 3 - Improved Shortcut List Spacing (Priority: P2)

Users view the shortcut list with proper left and right margins that provide visual breathing room and align with standard UI spacing conventions.

**Why this priority**: Enhances visual consistency and readability, though less critical than functional improvements.

**Independent Test**: Can be fully tested by opening shortcut settings and visually verifying appropriate margins exist on both sides of the list.

**Acceptance Scenarios**:

1. **Given** the user opens shortcut settings, **When** they view the shortcut list, **Then** the list has 16px left and right margins matching the application's spacing standards
2. **Given** the shortcut list has multiple entries, **When** the user scrolls through the list, **Then** margins remain consistent throughout

---

### User Story 4 - Streamlined Modal Closing (Priority: P3)

Users close the prompt use modal using only the X icon in the header, with the redundant Cancel button removed from the footer.

**Why this priority**: Reduces visual clutter and removes unnecessary UI elements, but is the least critical change as existing functionality works correctly.

**Independent Test**: Can be fully tested by opening the prompt use modal, clicking the X icon to close it, and verifying the Cancel button no longer appears in the modal footer.

**Acceptance Scenarios**:

1. **Given** the user opens a prompt use modal, **When** they view the modal, **Then** only the X icon appears in the header and no Cancel button appears in the footer
2. **Given** the prompt use modal is open, **When** the user clicks the X icon, **Then** the modal closes successfully
3. **Given** the prompt use modal is open, **When** the user presses Escape, **Then** the modal closes successfully (standard behavior maintained)
4. **Given** the prompt use modal is open, **When** the user clicks outside the modal on the backdrop, **Then** the modal closes successfully

---

### Edge Cases

- When a user has partially configured LLM settings (provider selected but no models configured), the system displays inline validation errors requiring both model fields to be filled before saving
- When timeout values are set to zero, negative numbers, or values exceeding 999 seconds, the system displays inline validation errors and prevents saving until valid values (1-999) are entered
- When a user rapidly clicks the favorite star icon multiple times in succession, the system debounces the clicks and processes only the final state after a short delay to prevent race conditions
- When network connectivity is lost and the favorite toggle cannot be persisted, the system updates the UI optimistically but displays an error notification immediately, requiring the user to manually retry

## Requirements *(mandatory)*

### Functional Requirements

#### LLM Settings Consolidation

- **FR-001**: System MUST combine LLM call settings and LLM title generation settings into a single unified settings tab with a single-column layout: provider selection at the top, followed by two clearly separated sections for LLM Call Settings and Title Generation Settings
- **FR-002**: System MUST allow users to select exactly one LLM provider that applies to both LLM calls and title generation
- **FR-003**: System MUST provide separate model selection fields for LLM calls and title generation within the unified settings interface, both fields are required before saving
- **FR-004**: System MUST provide separate timeout configuration fields for LLM calls and title generation, accepting values between 1 and 999 seconds inclusive, with default values of 60 seconds for LLM calls and 30 seconds for title generation
- **FR-005**: System MUST remove the Display Name field from LLM call settings as it serves no functional purpose
- **FR-006**: System MUST persist all LLM configuration settings (provider, models, timeouts) across application sessions
- **FR-007**: System MUST validate that timeout values are positive integers between 1 and 999 seconds and display inline validation errors that prevent saving until corrected

#### Favorite Toggle Enhancement

- **FR-008**: System MUST display a star icon in the top-right corner of every prompt card in the main prompt list
- **FR-009**: System MUST render the star icon as filled when a prompt is favorited and empty when not favorited
- **FR-010**: System MUST toggle the favorite status when a user clicks the star icon, with click debouncing to process only the final state after a short delay (e.g., 300ms)
- **FR-011**: System MUST persist favorite status changes immediately, updating UI optimistically and displaying an error notification if persistence fails, without automatic retries
- **FR-012**: System MUST update the visual state of the star icon immediately after toggling

#### UI Spacing Improvements

- **FR-013**: System MUST apply 16px left and right margins to the shortcut list view, aligning with application's standard spacing guidelines

#### Modal Simplification

- **FR-015**: System MUST remove the Cancel button from the prompt use modal footer
- **FR-016**: System MUST retain the X icon in the modal header for closing
- **FR-017**: System MUST support closing the modal via Escape key and clicking outside the modal on the backdrop

### Key Entities

- **LLM Configuration**: Settings that define provider selection, model choices (separate for calls and title generation), and timeout values (separate for calls and title generation)
- **Prompt**: A user-created or system-provided prompt that can have favorite status toggled
- **Favorite Status**: Boolean attribute of a prompt indicating whether it has been marked as favorite by the user
- **Shortcut**: A user-defined keyboard shortcut configuration displayed in the shortcut settings list

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete full LLM configuration (provider, both models, both timeouts) in under 1 minute by accessing a single unified settings interface
- **SC-002**: Users can toggle favorite status on any prompt in under 2 seconds by clicking the always-visible star icon
- **SC-003**: 100% of prompt cards display favorite toggle capability regardless of current favorite status
- **SC-004**: Shortcut list view matches application-wide spacing standards with consistent margins visible on all screen sizes
- **SC-005**: Modal closing options are reduced from 2+ buttons (X icon + Cancel) to a single consistent method (X icon only), reducing visual clutter by at least 30%
- **SC-006**: Settings interface complexity is reduced by consolidating 2 separate LLM configuration locations into 1 unified tab
- **SC-007**: Users successfully configure different models for LLM calls vs title generation without confusion or errors in 95% of configuration attempts
