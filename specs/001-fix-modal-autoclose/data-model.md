# Data Model: Fix Modal Auto-Close Setting Connection

**Date**: 2025-11-11  
**Feature**: 001-fix-modal-autoclose  
**Phase**: Phase 1 - Data Model Documentation

## Overview

This bug fix involves connecting existing state structures. No new data models are created; we're documenting the existing state that needs to be properly synchronized.

## State Structures

### Global Application State (Zustand)

**Store**: `useAppStore` (`src/renderer/stores/useAppStore.ts`)

**Relevant State Section**:

```typescript
interface AppStore {
  // ... other properties
  settings: AppSettings;
  // ... other properties
}

interface AppSettings {
  // General settings
  language: 'ko' | 'en' | 'ja';
  autoCloseModal: boolean;  // ← THE SETTING WE NEED TO READ
  projectPath: string;
  
  // ... other settings (editor, search, window, shortcuts)
}
```

**Properties**:

| Property | Type | Default | Persistence | Description |
|----------|------|---------|-------------|-------------|
| `autoCloseModal` | `boolean` | `true` | ✅ localStorage | Global preference for modal auto-close behavior |

**Access Pattern**:
```typescript
const { settings } = useAppStore();
const autoCloseEnabled = settings.autoCloseModal;
```

**Persistence**: 
- Stored via Zustand `persist` middleware
- Storage key: `'promptory-app-store'`
- Partition: `settings` object is persisted
- Survives app restarts

### Component Local State (React)

**Component**: `ParameterInputModal` (`src/renderer/components/prompt/ParameterInputModal.tsx`)

**Current State**:

```typescript
interface ParameterInputModalState {
  parameterValues: ParameterValues;         // Form input values
  processedContent: string;                 // Rendered prompt content
  autoClose: boolean;                       // ← LOCAL OVERRIDE STATE
  isLoading: boolean;                       // Copy operation loading
}
```

**Properties**:

| Property | Type | Initial Value | Scope | Description |
|----------|------|---------------|-------|-------------|
| `autoClose` | `boolean` | Currently: `true` (hardcoded)<br>Should be: `settings.autoCloseModal` | Per-session | Local override for auto-close behavior |

**Lifecycle**:
- Initialized when modal opens (useEffect with `isOpen` dependency)
- Reset when modal closes
- Changes do NOT persist to global settings
- Allows user to temporarily override global preference

## State Flow Diagram

```
┌─────────────────────────────────────┐
│  Global Settings (Persisted)       │
│  useAppStore                        │
│  ┌─────────────────────────────┐   │
│  │ settings: {                 │   │
│  │   autoCloseModal: boolean   │   │
│  │ }                           │   │
│  └─────────────────────────────┘   │
└───────────────┬─────────────────────┘
                │ READ (initialization)
                ↓
┌─────────────────────────────────────┐
│  ParameterInputModal State          │
│  ┌─────────────────────────────┐   │
│  │ autoClose: boolean          │   │
│  │   (initialized from global)  │   │
│  └─────────────────────────────┘   │
└───────────────┬─────────────────────┘
                │
                ↓
┌─────────────────────────────────────┐
│  User Actions in Modal              │
│  ┌─────────────────────────────┐   │
│  │ 1. Toggle checkbox          │   │
│  │    → Updates LOCAL state    │   │
│  │    → Does NOT persist       │   │
│  │                             │   │
│  │ 2. Copy prompt             │   │
│  │    → If autoClose === true │   │
│  │       → Close modal        │   │
│  │    → If autoClose === false│   │
│  │       → Keep modal open    │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## State Synchronization Rules

### Initialization (Modal Opens)

**Trigger**: `isOpen` prop changes from `false` to `true`

**Behavior**:
```typescript
useEffect(() => {
  if (isOpen && prompt) {
    // Initialize parameter values
    const initialValues: ParameterValues = {};
    prompt.metadata.parameters.forEach(param => {
      initialValues[param.name] = '';
    });
    setParameterValues(initialValues);
    
    // NEW: Initialize autoClose from global setting
    // (Currently missing - causes the bug)
  }
}, [isOpen, prompt]);
```

**Fix Required**: Add autoClose initialization from `settings.autoCloseModal`

### Local Override (Checkbox Toggle)

**Trigger**: User clicks checkbox in modal footer

**Behavior**:
```typescript
<input
  type="checkbox"
  checked={autoClose}
  onChange={(e) => setAutoClose(e.target.checked)}  // ← Local state only
  className="mr-2"
/>
```

**Rule**: Changes do NOT write back to global settings (FR-004)

### Modal Close

**Trigger**: 
1. Manual close (X button, ESC key)
2. Automatic close after successful copy (if `autoClose === true`)

**Behavior**:
- Local state is destroyed (component unmounts)
- Next open will re-initialize from global setting

## Validation Rules

**No validation required** - boolean flag with only two valid states.

## State Transitions

```
State: Closed
  ↓ (user opens modal)
State: Open (autoClose = settings.autoCloseModal)
  ↓ (user toggles checkbox)
State: Open (autoClose = !previous value)
  ↓ (user copies prompt)
  ├─ If autoClose === true → State: Closed
  └─ If autoClose === false → State: Open
  ↓ (user manually closes)
State: Closed
  ↓ (user opens modal again)
State: Open (autoClose = settings.autoCloseModal)  ← Reset from global
```

**Key Insight**: Local state resets to global setting each time modal opens

## Edge Cases

### Case 1: Setting Changed While Modal is Open

**Scenario**: User changes global setting while parameter modal is already open

**Expected Behavior**: Modal continues using the value from when it opened

**Implementation**: No special handling needed - modal doesn't subscribe to setting changes

**Rationale**: Changing behavior mid-session would be confusing

### Case 2: Copy Operation Fails

**Scenario**: Copy fails (clipboard error, validation error)

**Expected Behavior**: Modal stays open regardless of `autoClose` value

**Implementation**: Already handled - copy only closes modal in success case

**Code** (line 78):
```typescript
if (autoClose) {
  onClose();  // Only called if copy succeeds
}
```

### Case 3: Default Value (First Launch)

**Scenario**: User has never changed the setting (using default)

**Expected Behavior**: Modal uses `autoClose = true`

**Implementation**: Zustand store has default value of `true` in `defaultSettings`

**Code** (`useAppStore.ts` line 139):
```typescript
const defaultSettings: AppSettings = {
  // ...
  autoCloseModal: true,  // ← Default value
  // ...
};
```

## Testing Data Requirements

### Test Fixtures

**Mock Store State - autoClose Enabled**:
```typescript
const mockStoreEnabled = {
  settings: {
    autoCloseModal: true,
    // ... other settings
  },
  // ... other store state
};
```

**Mock Store State - autoClose Disabled**:
```typescript
const mockStoreDisabled = {
  settings: {
    autoCloseModal: false,
    // ... other settings
  },
  // ... other store state
};
```

**Mock Prompt with Parameters**:
```typescript
const mockPrompt: PromptFile = {
  id: 'test-prompt',
  path: 'test/prompt.md',
  metadata: {
    title: 'Test Prompt',
    tags: [],
    favorite: false,
    created_at: '2025-01-01T00:00:00Z',
    parameters: [
      {
        name: 'testParam',
        type: 'string',
        required: true
      }
    ]
  },
  content: 'Test content with {{testParam}}',
  modifiedAt: '2025-01-01T00:00:00Z',
  fileSize: 100
};
```

## Migration & Compatibility

**Migration Required**: ❌ NO

**Reason**: 
- No schema changes
- No data transformation needed
- Existing persisted settings remain valid
- Change is purely behavioral (code logic)

**Backward Compatibility**: ✅ YES

**Reason**:
- No breaking changes to data structures
- All existing data remains valid
- No API changes

## Performance Considerations

**State Read Cost**: O(1) - Direct property access

**Memory Impact**: None - no additional state stored

**Re-render Impact**: None - same re-render pattern as before

**Store Subscription**: Only during component mount - no continuous subscription

## Summary

| Aspect | Details |
|--------|---------|
| **Data Structures Modified** | 0 (no schema changes) |
| **New Fields Added** | 0 (using existing `autoCloseModal`) |
| **State Synchronization** | Read-only: Global → Local (on init) |
| **Persistence** | Global setting persists, local override does not |
| **Migration Required** | No |
| **Test Fixtures** | 2 mock store states (enabled/disabled) |

**Key Takeaway**: This is a pure synchronization fix. The data models already exist and are correct - we're just connecting them properly.

