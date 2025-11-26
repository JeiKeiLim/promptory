# Feature Specification: Fix Modal Auto-Close Setting Connection

**Feature Branch**: `001-fix-modal-autoclose`  
**Created**: 2025-11-11  
**Status**: Draft  
**Input**: User description: "현재 설정창에 모달 자동 닫기 설정이 있는데 이 설정이 프롬프트 사용에서 복사 후 자동으로 닫기와 연동이 안되고 있음. 이 문제를 해결해야 함"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Settings Sync for Modal Auto-Close (Priority: P1)

Users who configure the "auto-close modal" setting in the application settings expect that setting to control whether the parameter input modal automatically closes after copying a prompt. Currently, the modal has its own independent checkbox, but it doesn't read from or respect the global setting configured in the settings window.

**Why this priority**: This is a core user experience issue. Users set preferences once in settings and expect those preferences to be respected throughout the application. The current disconnection creates confusion and violates the principle of least surprise.

**Independent Test**: Can be fully tested by:
1. Setting "auto-close modal" to OFF in settings
2. Opening any prompt with parameters
3. Copying the prompt
4. Verifying the modal does NOT auto-close

**Acceptance Scenarios**:

1. **Given** user has "auto-close modal" setting enabled in general settings, **When** user copies a prompt from the parameter input modal, **Then** the modal automatically closes after successful copy
2. **Given** user has "auto-close modal" setting disabled in general settings, **When** user copies a prompt from the parameter input modal, **Then** the modal remains open after copy
3. **Given** user changes the "auto-close modal" setting in general settings, **When** user opens a prompt parameter modal, **Then** the modal's auto-close checkbox reflects the current global setting
4. **Given** user is in the parameter input modal, **When** user toggles the local auto-close checkbox, **Then** the setting applies to that session only and does not persist globally
5. **Given** user has never changed the "auto-close modal" setting, **When** user opens a prompt parameter modal, **Then** the auto-close checkbox is checked by default (respecting the default setting of `true`)

---

### Edge Cases

- What happens when the user changes the global "auto-close modal" setting while a parameter input modal is already open? (Modal should continue using the setting value from when it opened)
- What happens when copy fails (e.g., clipboard permission denied)? (Modal should not close regardless of auto-close setting)
- What happens when required parameters are missing and validation fails? (Copy doesn't execute, so modal doesn't close)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The parameter input modal MUST read the global `autoCloseModal` setting from application settings when initializing
- **FR-002**: The parameter input modal MUST use the global setting value to determine whether to close after successful copy operation
- **FR-003**: The modal's local auto-close checkbox MUST be initialized with the current value from global settings
- **FR-004**: Changes to the local auto-close checkbox in the modal MUST NOT persist to global settings
- **FR-005**: The modal MUST only close when both conditions are met: copy operation succeeds AND auto-close is enabled
- **FR-006**: Failed copy operations (errors, validation failures) MUST NOT trigger modal close regardless of auto-close setting
- **FR-007**: The auto-close behavior MUST be consistent across all three languages (Korean, English, Japanese)

### Key Entities

- **AppSettings**: Global application settings containing the `autoCloseModal` boolean preference
- **ParameterInputModal State**: Local modal state that should be initialized from global settings

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of users who disable "auto-close modal" in settings observe that the parameter modal stays open after copy
- **SC-002**: 100% of users who enable "auto-close modal" in settings observe that the parameter modal closes after copy
- **SC-003**: The parameter modal respects the global setting immediately when opened (no delay or mismatch)
- **SC-004**: User confusion reports related to "auto-close not working" are reduced to zero
- **SC-005**: The fix maintains existing functionality - keyboard shortcuts, validation, and error handling continue to work as before

## Assumptions

- The global `autoCloseModal` setting is stored in the Zustand `useAppStore` under `settings.autoCloseModal`
- The default value for `autoCloseModal` is `true` (closes by default)
- The local checkbox in the modal should remain for user convenience (per-session override without changing global preference)
- Settings are persisted using Zustand's persistence middleware
- The copy operation uses the browser's `navigator.clipboard` API

## Technical Context

This is a simple state synchronization issue where:
- The **global setting** lives in `useAppStore().settings.autoCloseModal`
- The **modal's local state** is currently hardcoded: `const [autoClose, setAutoClose] = useState(true)`
- The fix requires reading from the store: `const { settings } = useAppStore()` and initializing with `settings.autoCloseModal`

## Out of Scope

- Changing the default value of `autoCloseModal`
- Removing the local checkbox from the modal
- Adding new settings related to modal behavior
- Persisting per-session overrides made via the local checkbox
- Changing the copy operation itself or validation logic
