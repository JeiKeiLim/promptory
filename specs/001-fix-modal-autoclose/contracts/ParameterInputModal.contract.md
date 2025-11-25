# Component Contract: ParameterInputModal

**Component**: `ParameterInputModal`  
**Location**: `src/renderer/components/prompt/ParameterInputModal.tsx`  
**Type**: React Functional Component  
**Category**: Modal Dialog (Prompt Feature)

## Purpose

Displays a modal dialog for users to input parameter values for a prompt template, preview the result in real-time, and copy the final prompt to clipboard.

## Props Interface

```typescript
interface ParameterInputModalProps {
  prompt: PromptFile;           // Prompt with parameters to fill
  isOpen: boolean;              // Modal visibility state
  onClose: () => void;          // Callback to close modal
}
```

### Prop Specifications

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `prompt` | `PromptFile` | ✅ Yes | Complete prompt data including metadata with parameters |
| `isOpen` | `boolean` | ✅ Yes | Controls modal visibility (true = shown, false = hidden) |
| `onClose` | `() => void` | ✅ Yes | Callback invoked when modal should close (manual or automatic) |

### PromptFile Type Reference

```typescript
interface PromptFile {
  id: string;
  path: string;
  metadata: PromptMetadata;
  content: string;              // Template with {{parameter}} placeholders
  modifiedAt: string;
  fileSize: number;
}

interface PromptMetadata {
  title: string;
  description?: string;
  tags: string[];
  favorite: boolean;
  created_at: string;
  parameters: PromptParameter[];  // ← Used by modal
}

interface PromptParameter {
  name: string;                  // Parameter name (used in {{name}} placeholders)
  type: 'string' | 'category';   // Input type
  required: boolean;             // Validation requirement
  description?: string;          // Help text
  options?: string[];            // For category type only
}
```

## Behavior Contract

### Initialization Behavior

**When**: `isOpen` changes from `false` to `true`

**Actions**:
1. ✅ Reset all parameter values to empty strings
2. ✅ Initialize `autoClose` state from global `settings.autoCloseModal` (**FIX REQUIRED**)
3. ✅ Reset processed content to original template
4. ✅ Clear loading state

**Current Bug**: Step 2 currently initializes with hardcoded `true`

### Auto-Close Behavior (Focus of Fix)

**When**: Copy operation succeeds

**Conditions**:
```typescript
if (copySucceeds && autoClose === true) {
  onClose();  // Modal closes
} else {
  // Modal remains open
}
```

**Decision Flow**:
```
Copy button clicked
  ↓
Validate required parameters
  ├─ Invalid → Show error toast → Stay open
  └─ Valid → Proceed
      ↓
Copy to clipboard
  ├─ Fails → Show error toast → Stay open
  └─ Succeeds → Show success toast
      ↓
Check autoClose setting
  ├─ true → Call onClose() → Modal closes
  └─ false → Stay open
```

**Fix Required**: Initialize `autoClose` from global setting, not hardcoded `true`

### Real-Time Preview

**When**: User types in parameter input field

**Action**: Update `processedContent` by replacing all `{{parameterName}}` with actual values

**Pattern Matching**: 
```typescript
const regex = new RegExp(`\\{\\{${paramName}\\}\\}`, 'g');
content = content.replace(regex, value || `{{${paramName}}}`);
```

**Behavior**:
- Empty values: Leave placeholder unchanged (`{{paramName}}`)
- Filled values: Replace with actual text

### Validation Behavior

**Trigger**: Copy button click

**Rules**:
1. **Required Parameters**: Must have non-empty trimmed value
2. **Optional Parameters**: Can be empty
3. **Category Parameters**: Must be one of the defined options (or empty if optional)

**Error Handling**:
```typescript
// If validation fails:
- Show error toast with missing parameter names
- Do NOT proceed with copy
- Keep modal open (regardless of autoClose setting)
```

### Keyboard Shortcuts

| Shortcut | Action | Behavior |
|----------|--------|----------|
| `ESC` | Close modal | Always closes, no confirmation |
| `Cmd/Ctrl + Shift + C` | Copy | Same as clicking Copy button (validation, auto-close) |

**Implementation**: Event listener attached when `isOpen === true`

### Local State vs Global Setting

**Global Setting** (`settings.autoCloseModal`):
- Controlled by user in Settings → General
- Persists across app restarts
- Default value: `true`

**Local State** (`autoClose`):
- Initialized from global setting (**current bug: hardcoded**)
- Can be toggled via checkbox in modal footer
- Changes do NOT persist to global setting
- Resets to global value when modal reopens

**User Experience**:
```
User workflow:
1. Set global setting to OFF in settings
2. Open modal → checkbox is unchecked (respects global setting)
3. Toggle checkbox ON → only affects this session
4. Copy prompt → modal closes (local override)
5. Close and reopen modal → checkbox is unchecked again (reset from global)
```

## State Management Integration

### Global State Dependencies

**Store**: `useAppStore`

**Required Hook**:
```typescript
const { settings } = useAppStore();
```

**Accessed Properties**:
```typescript
settings.autoCloseModal: boolean  // ← Read during initialization
```

**Write Operations**: ❌ NONE - Component only reads, never writes to global settings

### Component Local State

```typescript
const [parameterValues, setParameterValues] = useState<ParameterValues>({});
const [processedContent, setProcessedContent] = useState('');
const [autoClose, setAutoClose] = useState(settings.autoCloseModal);  // ← FIX
const [isLoading, setIsLoading] = useState(false);
```

## UI Layout Contract

### Modal Structure

```
┌────────────────────────────────────────────────────┐
│ Header                                             │
│ - Title: "파라미터 입력" (i18n key)                 │
│ - Subtitle: Prompt title                          │
│ - Close button (X)                                │
├────────────────────────────────────────────────────┤
│ Content (2-column split)                           │
│ ┌─────────────────────┬──────────────────────────┐ │
│ │ Left: Input Panel  │ Right: Preview Panel     │ │
│ │ - Parameter forms  │ - Processed content      │ │
│ │ - Type-specific    │ - Real-time update       │ │
│ │   inputs           │                          │ │
│ │ - Help text        │                          │ │
│ └─────────────────────┴──────────────────────────┘ │
├────────────────────────────────────────────────────┤
│ Footer                                             │
│ - Left: Auto-close checkbox (local control)       │
│ - Right: Cancel button + Copy button              │
└────────────────────────────────────────────────────┘
```

### Responsive Behavior

- Modal: Fixed max-width (6xl), max-height (90vh)
- Scroll: Both panels independently scrollable
- Content: Flexbox layout with flex-1 for auto-sizing

## Error Handling Contract

### Error Scenarios

| Scenario | Handling | Modal Behavior |
|----------|----------|----------------|
| Empty required parameters | Toast error with parameter names | Stay open |
| Clipboard API fails | Toast error: "복사 실패" | Stay open |
| Validation fails | Toast error | Stay open |
| No parameters in prompt | Show message: "파라미터가 없습니다" | Allow copy anyway |

### Loading States

**During Copy**:
- `isLoading = true`
- Copy button shows: "복사 중..."
- Copy button disabled

**After Copy (Success)**:
- `isLoading = false`
- Show success toast
- Apply auto-close logic

**After Copy (Error)**:
- `isLoading = false`
- Show error toast
- Keep modal open

## Internationalization Contract

**All UI strings MUST use i18n translation keys:**

| String | Translation Key | Languages |
|--------|----------------|-----------|
| Modal title | `parameterInputModal.title` | ko, en, ja |
| Parameter input | `parameterInputModal.parameterInput` | ko, en, ja |
| Preview | `parameterInputModal.preview` | ko, en, ja |
| Auto-close checkbox | `parameterInputModal.autoClose` | ko, en, ja |
| Copy button | `parameterInputModal.copyToClipboard` | ko, en, ja |
| Copying... | `parameterInputModal.copying` | ko, en, ja |
| Copy success | `parameterInputModal.copySuccess` | ko, en, ja |
| Copy failed | `parameterInputModal.copyFailed` | ko, en, ja |
| Required params error | `parameterInputModal.requiredParams` | ko, en, ja |

**No Hardcoded Strings**: All must go through `t()` function from `useTranslation()`

## Testing Contract

### Unit/Integration Tests Required

**Test File**: `tests/integration/components/ParameterInputModal.test.tsx`

**Test Cases**:

```typescript
describe('ParameterInputModal', () => {
  describe('Initialization', () => {
    it('should initialize autoClose from global setting (enabled)', () => {
      // Mock useAppStore with autoCloseModal: true
      // Render modal with isOpen: true
      // Assert checkbox is checked
    });

    it('should initialize autoClose from global setting (disabled)', () => {
      // Mock useAppStore with autoCloseModal: false
      // Render modal with isOpen: true
      // Assert checkbox is unchecked
    });
  });

  describe('Auto-Close Behavior', () => {
    it('should close modal after copy when autoClose is true', async () => {
      // Mock autoCloseModal: true
      // Fill parameters
      // Click copy button
      // Assert onClose was called
    });

    it('should keep modal open after copy when autoClose is false', async () => {
      // Mock autoCloseModal: false
      // Fill parameters
      // Click copy button
      // Assert onClose was NOT called
    });

    it('should keep modal open on copy failure regardless of autoClose', async () => {
      // Mock clipboard.writeText to throw error
      // Click copy button
      // Assert onClose was NOT called
    });
  });

  describe('Local Override', () => {
    it('should allow toggling autoClose checkbox without persisting', () => {
      // Mock autoCloseModal: true
      // Toggle checkbox to unchecked
      // Assert local state changed
      // Assert global setting unchanged
    });
  });
});
```

### Manual Test Scenarios

**Scenario 1: Respect Global Setting ON**
- [ ] Set "Auto-close modal" to ON in settings
- [ ] Open prompt with parameters
- [ ] Verify checkbox is checked
- [ ] Copy prompt
- [ ] Verify modal closes automatically

**Scenario 2: Respect Global Setting OFF**
- [ ] Set "Auto-close modal" to OFF in settings
- [ ] Open prompt with parameters
- [ ] Verify checkbox is unchecked
- [ ] Copy prompt
- [ ] Verify modal stays open

**Scenario 3: Local Override**
- [ ] Set global setting to OFF
- [ ] Open modal (checkbox unchecked)
- [ ] Toggle checkbox to ON
- [ ] Copy prompt (modal closes)
- [ ] Reopen modal
- [ ] Verify checkbox is unchecked again (reset from global)

**Scenario 4: Error Handling**
- [ ] Leave required parameter empty
- [ ] Click copy
- [ ] Verify error toast shown
- [ ] Verify modal stays open (even if autoClose is ON)

## Contract Violations (Bugs)

### Current Bug

**Violation**: Component initializes `autoClose` state with hardcoded value instead of reading from global settings

**Location**: Line 29 of `ParameterInputModal.tsx`

**Current Code**:
```typescript
const [autoClose, setAutoClose] = useState(true);  // ❌ Hardcoded
```

**Expected Code**:
```typescript
const { settings } = useAppStore();
const [autoClose, setAutoClose] = useState(settings.autoCloseModal);  // ✅ From global
```

**Impact**: Users who disable the setting in preferences still see auto-close behavior

**Fix PR**: Will be addressed in 001-fix-modal-autoclose

## Dependencies

**External**:
- `react` - Component framework
- `react-i18next` - Internationalization
- `marked` - Markdown parsing (used in preview)
- `@renderer/stores/useAppStore` - Global settings (**FIX: Add import**)
- `@renderer/components/common/ToastContainer` - Error/success messages

**Internal**:
- `@shared/types/prompt` - Type definitions
- Translation files: `src/renderer/i18n/locales/{ko,en,ja}.json`

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-11 | Initial contract documentation |
| 1.1.0 | TBD | Fix autoClose initialization from global settings |

## Contract Guarantees

✅ **Type Safety**: All props and state are strongly typed  
✅ **i18n Support**: All strings use translation keys  
✅ **Keyboard Accessible**: ESC and Cmd+Shift+C work  
✅ **Error Resilient**: Copy failures don't crash component  
❌ **Settings Sync**: Currently broken - will be fixed  
✅ **Validation**: Required parameters enforced  
✅ **Real-Time Preview**: Updates as user types

