# IPC Contract: Favorite Toggle

**Channel**: `prompt:update-favorite`  
**Purpose**: Toggle favorite status on prompt cards with optimistic UI updates  
**Version**: 1.0

---

## Channel

### `prompt:update-favorite`

**Direction**: Renderer → Main  
**Purpose**: Update favorite status of a prompt (debounced to prevent race conditions)

**Request**:
```typescript
{
  id: string;           // Prompt ID (file path or unique identifier)
  favorite: boolean;    // New favorite status
}
```

**Response**:
```typescript
{
  success: boolean;
  error?: string;
}
```

**Success Example**:
```json
{
  "success": true
}
```

**Error Example**:
```json
{
  "success": false,
  "error": "Prompt file not found: /path/to/prompt.md"
}
```

**Error Conditions**:
- Prompt file not found → Returns error
- File system permission error → Returns error
- YAML parsing error (corrupted file) → Returns error
- File currently locked (race condition) → Returns error

---

## Usage Pattern (Renderer)

### Debounced Toggle with Optimistic Updates

```typescript
// src/renderer/components/layout/MainContent.tsx

import { debounce } from 'lodash'; // Or custom implementation
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';

// Debounce timer per prompt (prevent race conditions)
const debouncedToggleMap = new Map<string, ReturnType<typeof debounce>>();

function handleFavoriteToggle(promptId: string, currentState: boolean) {
  // 1. Optimistic UI update (immediate visual feedback)
  updateLocalState(promptId, !currentState);
  
  // 2. Get or create debounced function for this prompt
  if (!debouncedToggleMap.has(promptId)) {
    const debouncedFn = debounce(async (id: string, newState: boolean) => {
      try {
        // 3. IPC call after 300ms debounce
        const result = await window.electronAPI.invoke(
          IPC_CHANNELS.PROMPT_UPDATE_FAVORITE,
          { id, favorite: newState }
        );
        
        if (!result.success) {
          // 4a. Rollback on failure
          updateLocalState(id, !newState);
          toast.error(result.error || 'Failed to update favorite status');
        }
        // 4b. Success: No action needed (already optimistically updated)
      } catch (error) {
        // 4c. Rollback on exception
        updateLocalState(id, !newState);
        toast.error('Failed to update favorite status');
      }
    }, 300); // 300ms debounce (per user clarification)
    
    debouncedToggleMap.set(promptId, debouncedFn);
  }
  
  // 5. Trigger debounced function
  const debouncedFn = debouncedToggleMap.get(promptId)!;
  debouncedFn(promptId, !currentState);
}
```

---

## Implementation (Main Process)

```typescript
// src/main/handlers/promptHandler.ts

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { PromptMetadata } from '@shared/types/prompt';

export function registerPromptHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.PROMPT_UPDATE_FAVORITE,
    async (_, { id, favorite }: { id: string; favorite: boolean }) => {
      try {
        // 1. Load prompt file
        const promptPath = resolvePromptPath(id);
        const content = await fs.readFile(promptPath, 'utf-8');
        
        // 2. Parse YAML front matter
        const { metadata, body } = parseMarkdownWithFrontMatter(content);
        
        // 3. Update favorite field
        const updatedMetadata: PromptMetadata = {
          ...metadata,
          favorite
        };
        
        // 4. Write back to file (atomic operation)
        const updatedContent = serializeMarkdownWithFrontMatter(updatedMetadata, body);
        await writeFileAtomic(promptPath, updatedContent);
        
        // 5. File watcher will detect change and update Zustand store
        // (No need to manually trigger store update)
        
        return { success: true };
      } catch (error) {
        console.error('Failed to update favorite status:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );
}

// Atomic write helper (write to temp, then rename)
async function writeFileAtomic(path: string, content: string): Promise<void> {
  const tempPath = `${path}.tmp`;
  await fs.writeFile(tempPath, content, 'utf-8');
  await fs.rename(tempPath, path);
}
```

---

## UI Component Example

```typescript
// Favorite star button component

interface FavoriteStarProps {
  promptId: string;
  isFavorite: boolean;
  onToggle: (promptId: string, currentState: boolean) => void;
}

const FavoriteStar: React.FC<FavoriteStarProps> = ({ 
  promptId, 
  isFavorite, 
  onToggle 
}) => {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // Prevent triggering parent click handlers
        onToggle(promptId, isFavorite);
      }}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      className="p-1 hover:bg-gray-100 rounded transition-colors"
    >
      <StarIcon 
        className={`w-5 h-5 transition-colors ${
          isFavorite 
            ? 'fill-yellow-400 stroke-yellow-500' 
            : 'fill-none stroke-gray-400 hover:stroke-yellow-500'
        }`}
      />
    </button>
  );
};
```

---

## Prompt Card Integration

```tsx
// src/renderer/components/layout/MainContent.tsx

<div className="prompt-card relative">
  {/* Favorite star in top-right corner */}
  <div className="absolute top-2 right-2 z-10">
    <FavoriteStar
      promptId={prompt.id}
      isFavorite={prompt.metadata.favorite}
      onToggle={handleFavoriteToggle}
    />
  </div>
  
  {/* Rest of prompt card content */}
  <div className="prompt-card-content">
    <h3>{prompt.metadata.title}</h3>
    <p>{prompt.metadata.description}</p>
  </div>
</div>
```

---

## File Watcher Integration

**Existing Mechanism**: Chokidar file watcher detects changes to prompt files

**Flow**:
```
User clicks star (renderer)
  ↓
Optimistic UI update (star fills immediately)
  ↓
Debounced IPC call (300ms delay)
  ↓
Main process updates YAML front matter in file
  ↓
Chokidar detects file change
  ↓
File watcher handler reads updated file
  ↓
Zustand store updated with new favorite status
  ↓
React components re-render (no visual change since already optimistic)
```

**Note**: Optimistic update provides immediate feedback; file watcher update confirms persistence.

---

## Error Recovery

### Network/Storage Failure

**User Experience** (per user clarification):
- Optimistic UI update (star changes immediately)
- If IPC call fails: Show error notification immediately
- No automatic retries (desktop app, failures rare)
- User manually clicks star again to retry

**Implementation**:
```typescript
if (!result.success) {
  // Rollback optimistic update
  updateLocalState(promptId, originalState);
  
  // Show error notification
  toast.error(
    'Failed to update favorite status. Please try again.',
    {
      duration: 5000,
      action: {
        label: 'Retry',
        onClick: () => handleFavoriteToggle(promptId, originalState)
      }
    }
  );
}
```

---

## Race Condition Prevention

### Debouncing Strategy

**Problem**: User clicks star multiple times rapidly

**Solution**: Debounce per prompt ID (300ms)

```typescript
// Multiple rapid clicks on same prompt:
Click 1: Start timer (300ms)
Click 2: Cancel timer, start new timer (300ms)
Click 3: Cancel timer, start new timer (300ms)
  ... (300ms passes without new clicks)
Execute: Final state sent to main process
```

**Benefit**: Only final state is persisted, preventing conflicting writes to same file.

---

## Concurrent User Scenario

**Problem**: User rapidly toggles favorites on multiple different prompts

**Solution**: Separate debounce timers per prompt ID

```typescript
// Rapid clicks on different prompts:
Prompt A: Click → Timer A starts (300ms)
Prompt B: Click → Timer B starts (300ms)
Prompt C: Click → Timer C starts (300ms)
  ... (300ms passes)
All three execute concurrently (different files, no conflict)
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/renderer/components/FavoriteStar.test.tsx

describe('FavoriteStar', () => {
  it('should display filled star when favorited', () => {
    render(<FavoriteStar promptId="123" isFavorite={true} onToggle={jest.fn()} />);
    const icon = screen.getByRole('button');
    expect(icon).toHaveClass('fill-yellow-400');
  });
  
  it('should display empty star when not favorited', () => {
    render(<FavoriteStar promptId="123" isFavorite={false} onToggle={jest.fn()} />);
    const icon = screen.getByRole('button');
    expect(icon).toHaveClass('fill-none');
  });
  
  it('should call onToggle when clicked', async () => {
    const onToggle = jest.fn();
    render(<FavoriteStar promptId="123" isFavorite={false} onToggle={onToggle} />);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);
    
    expect(onToggle).toHaveBeenCalledWith('123', false);
  });
});
```

### Integration Tests

```typescript
// tests/integration/favorite-toggle.test.tsx

describe('Favorite Toggle Integration', () => {
  it('should persist favorite status via IPC', async () => {
    const mockIPC = jest.fn().mockResolvedValue({ success: true });
    window.electronAPI = { invoke: mockIPC };
    
    render(<MainContent />);
    
    // Find and click star on first prompt
    const stars = screen.getAllByLabelText(/add to favorites/i);
    await userEvent.click(stars[0]);
    
    // Wait for debounce (300ms)
    await waitFor(() => {
      expect(mockIPC).toHaveBeenCalledWith(
        IPC_CHANNELS.PROMPT_UPDATE_FAVORITE,
        { id: expect.any(String), favorite: true }
      );
    }, { timeout: 500 });
  });
  
  it('should rollback on IPC failure', async () => {
    const mockIPC = jest.fn().mockResolvedValue({ 
      success: false, 
      error: 'File not found' 
    });
    window.electronAPI = { invoke: mockIPC };
    
    render(<MainContent />);
    
    // Click star
    const star = screen.getByLabelText(/add to favorites/i);
    await userEvent.click(star);
    
    // Star should be optimistically filled
    expect(star).toHaveClass('fill-yellow-400');
    
    // Wait for debounce and IPC call
    await waitFor(() => expect(mockIPC).toHaveBeenCalled(), { timeout: 500 });
    
    // Star should rollback to empty after failure
    await waitFor(() => {
      expect(star).toHaveClass('fill-none');
    });
    
    // Error toast should be displayed
    expect(screen.getByText(/failed to update/i)).toBeInTheDocument();
  });
});
```

---

## Type Definitions

```typescript
// src/shared/constants/ipcChannels.ts

export const IPC_CHANNELS = {
  // ... existing channels ...
  
  // Favorite toggle
  PROMPT_UPDATE_FAVORITE: 'prompt:update-favorite',
} as const;

// src/shared/types/prompt.ts

export interface FavoriteToggleRequest {
  id: string;
  favorite: boolean;
}

export interface FavoriteToggleResponse {
  success: boolean;
  error?: string;
}
```

---

## Performance Metrics

**Target**:
- Optimistic UI update: <16ms (1 frame at 60fps)
- Debounce delay: 300ms (per user clarification)
- IPC round-trip: <50ms (local file system)
- Total perceived latency: 0ms (optimistic update)

**Measurement**:
```typescript
performance.mark('favorite-toggle-start');
handleFavoriteToggle(promptId, currentState);
performance.mark('favorite-toggle-optimistic-complete');

// After IPC completes
performance.mark('favorite-toggle-persisted');
performance.measure(
  'favorite-toggle-duration',
  'favorite-toggle-start',
  'favorite-toggle-persisted'
);
```

---

## Accessibility

**ARIA Labels**:
```tsx
<button
  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
  aria-pressed={isFavorite}
  role="button"
>
  <StarIcon />
</button>
```

**Keyboard Navigation**:
- Tab: Focus star button
- Enter/Space: Toggle favorite
- Escape: Cancel (no action needed, toggle is immediate)

---

## Summary

**New IPC Channel**: 1 (`prompt:update-favorite`)  
**Debouncing**: 300ms per prompt ID  
**Optimistic Updates**: Yes (immediate visual feedback)  
**Error Handling**: Rollback + user notification, no automatic retries  
**Race Condition Prevention**: Per-prompt debouncing  
**Testing**: Unit tests for component, integration tests for IPC flow
