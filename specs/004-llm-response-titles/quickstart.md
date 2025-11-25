# Quickstart: Automatic LLM Response Title Generation

**Feature**: 004-llm-response-titles  
**Phase**: 1 (Design)  
**Date**: 2025-11-25

## For Developers

### Getting Started

**Prerequisites**:
- Feature branch `004-llm-response-titles` checked out
- Dependencies installed: `pnpm install`
- Test suite passing: `pnpm test` (baseline: 291 tests)

**TDD Workflow** (Constitution Principle I):
1. Write test first (`pnpm test:watch`)
2. Verify test FAILS (RED)
3. Implement minimal code to pass (GREEN)
4. Refactor for quality (REFACTOR)
5. Commit with descriptive message

---

### Example 1: Generate Title for Response (Core Flow)

**Scenario**: User makes LLM call, system automatically generates title

```typescript
// 1. RED: Write failing test first
// tests/integration/title-generation-flow.test.ts

describe('Title Generation E2E', () => {
  it('should automatically generate title after response completes', async () => {
    // Given: User makes an LLM call
    const prompt = "Explain React hooks";
    const response = await generateLLMResponse(prompt);
    
    // When: Title generation completes
    const statusEvent = await waitForEvent('llm:title:status', {
      timeout: 35000  // 30s generation + 5s buffer
    });
    
    // Then: Response has generated title
    expect(statusEvent.responseId).toBe(response.id);
    expect(statusEvent.status).toBe('completed');
    expect(statusEvent.title).toMatch(/React.*Hook/i);  // Title about React hooks
    expect(statusEvent.title.split(' ').length).toBeGreaterThanOrEqual(5);
    expect(statusEvent.title.split(' ').length).toBeLessThanOrEqual(8);
    
    // And: Title persisted in database
    const metadata = await llmStorageService.getResponse(response.id);
    expect(metadata.generatedTitle).toBe(statusEvent.title);
    expect(metadata.titleGenerationStatus).toBe('completed');
  });
});
```

**Run test**: `pnpm test tests/integration/title-generation-flow.test.ts`  
**Expected**: ❌ FAIL (TitleGenerationService not implemented yet)

```typescript
// 2. GREEN: Implement TitleGenerationService

// src/main/services/TitleGenerationService.ts
export class TitleGenerationService {
  async generateTitle(responseId: string, content: string): Promise<void> {
    try {
      // Update status to pending
      await this.updateStatus(responseId, 'pending');
      
      // Generate title using LLM
      const title = await this.callLLM(content.slice(0, 500));
      
      // Update with completed title
      await this.updateTitle(responseId, title, 'completed');
    } catch (error) {
      await this.updateStatus(responseId, 'failed');
      console.error('Title generation failed:', error);
    }
  }
  
  private async callLLM(content: string): Promise<string> {
    const config = settingsService.getTitleGenerationConfig();
    const provider = providerFactory.getProvider(config.selectedProvider);
    
    const systemPrompt = `You are a title generator. Generate a concise, descriptive title for the given text.
Rules:
- Title must be 5-8 words
- Use the same language as the input text
- Be specific and descriptive
- No quotation marks or special formatting
- Output only the title, nothing else`;
    
    const response = await provider.generate({
      model: config.selectedModel,
      prompt: `Generate a title for this text:\n\n${content}`,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 50
    }, config.timeoutSeconds * 1000);
    
    return response.content.trim();
  }
}
```

**Run test again**: `pnpm test tests/integration/title-generation-flow.test.ts`  
**Expected**: ✅ PASS

```typescript
// 3. REFACTOR: Extract prompt template, add validation

// Move prompt to constants
const TITLE_GENERATION_PROMPT = {
  system: `You are a title generator...`,
  user: (content: string) => `Generate a title for this text:\n\n${content}`
};

// Add title validation
private validateTitle(title: string): string {
  const trimmed = title.trim().replace(/^["']|["']$/g, '');  // Remove quotes
  if (trimmed.length > 150) {
    return trimmed.slice(0, 147) + '...';
  }
  return trimmed;
}
```

**Run test again**: `pnpm test tests/integration/title-generation-flow.test.ts`  
**Expected**: ✅ PASS (refactoring shouldn't break tests)

**Commit**: `git commit -m "feat: implement automatic title generation (US1 P1)"`

---

### Example 2: Configure Title Generation Settings

**Scenario**: User changes title generation configuration in settings

```typescript
// 1. RED: Write failing test first
// tests/integration/ipc/titleGenerationHandlers.test.ts

describe('Title Generation Config IPC', () => {
  it('should update title generation config', async () => {
    // Given: User opens settings
    const currentConfig = await window.electron.llm.getTitleConfig();
    expect(currentConfig.success).toBe(true);
    
    // When: User changes timeout to 45 seconds
    const result = await window.electron.llm.setTitleConfig({
      timeoutSeconds: 45
    });
    
    // Then: Config updated successfully
    expect(result.success).toBe(true);
    expect(result.data.timeoutSeconds).toBe(45);
    
    // And: Next title generation uses new timeout
    const response = await generateLLMResponse("Test");
    // Verify timeout used (mock or measure actual time)
  });
  
  it('should reject invalid timeout', async () => {
    // When: User enters invalid timeout (200 seconds > 120 max)
    const result = await window.electron.llm.setTitleConfig({
      timeoutSeconds: 200
    });
    
    // Then: Validation error returned
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid timeout');
  });
});
```

**Run test**: `pnpm test tests/integration/ipc/titleGenerationHandlers.test.ts`  
**Expected**: ❌ FAIL (IPC handlers not implemented yet)

```typescript
// 2. GREEN: Implement IPC handlers

// src/main/handlers/llmHandlers.ts (extend existing)
export function registerTitleGenerationHandlers() {
  ipcMain.handle('llm:title:config:get', async () => {
    const config = settingsService.getTitleGenerationConfig();
    return { success: true, data: config };
  });
  
  ipcMain.handle('llm:title:config:set', async (_event, updates) => {
    // Validate timeout
    if (updates.timeoutSeconds !== undefined) {
      if (updates.timeoutSeconds < 10 || updates.timeoutSeconds > 120) {
        return { 
          success: false, 
          error: 'Invalid timeout: must be between 10 and 120 seconds' 
        };
      }
    }
    
    const config = settingsService.updateTitleGenerationConfig(updates);
    return { success: true, data: config };
  });
}
```

**Run test again**: `pnpm test tests/integration/ipc/titleGenerationHandlers.test.ts`  
**Expected**: ✅ PASS

**Commit**: `git commit -m "feat: add title generation configuration IPC (US2 P2)"`

---

### Example 3: Display Title in UI with Loading State

**Scenario**: User sees loading indicator while title generates, then title appears

```typescript
// 1. RED: Write failing test first
// tests/integration/components/ResponseListItem.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { ResponseListItem } from '@renderer/components/llm/ResponseListItem';

describe('ResponseListItem with Title', () => {
  it('should show loading indicator during title generation', async () => {
    // Given: Response with pending title
    const response = {
      id: 'test-123',
      model: 'gemma3:1b',
      titleGenerationStatus: 'pending',
      createdAt: Date.now()
    };
    
    render(<ResponseListItem response={response} />);
    
    // Then: Loading indicator visible
    expect(screen.getByTestId('title-loading')).toBeInTheDocument();
  });
  
  it('should show title prominently when generated', async () => {
    // Given: Response with completed title
    const response = {
      id: 'test-123',
      model: 'gemma3:1b',
      generatedTitle: 'React Component Best Practices',
      titleGenerationStatus: 'completed',
      createdAt: Date.now()
    };
    
    render(<ResponseListItem response={response} />);
    
    // Then: Title shown prominently
    const title = screen.getByText('React Component Best Practices');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-lg', 'font-semibold');  // Prominent styling
    
    // And: Model name shown as secondary info
    const modelName = screen.getByText(/gemma3:1b/i);
    expect(modelName).toBeInTheDocument();
    expect(modelName).toHaveClass('text-sm', 'text-gray-500');  // Secondary styling
  });
  
  it('should show model name fallback when title generation fails', async () => {
    // Given: Response with failed title
    const response = {
      id: 'test-123',
      model: 'gemma3:1b',
      titleGenerationStatus: 'failed',
      createdAt: Date.now()
    };
    
    render(<ResponseListItem response={response} />);
    
    // Then: Model name shown as primary (fallback)
    const modelName = screen.getByText('gemma3:1b');
    expect(modelName).toBeInTheDocument();
  });
});
```

**Run test**: `pnpm test tests/integration/components/ResponseListItem.test.tsx`  
**Expected**: ❌ FAIL (Component not implemented yet)

```typescript
// 2. GREEN: Implement ResponseListItem component

// src/renderer/components/llm/ResponseListItem.tsx
export const ResponseListItem: React.FC<Props> = ({ response }) => {
  const { titleGenerationLoading } = useLLMStore();
  const isLoading = titleGenerationLoading.get(response.id);
  
  const displayTitle = response.generatedTitle || response.model;
  const hasGeneratedTitle = !!response.generatedTitle;
  
  return (
    <div className="p-4 border-b hover:bg-gray-50">
      <div className="flex items-start gap-3">
        {isLoading && (
          <div data-testid="title-loading" className="animate-spin">
            ⟳
          </div>
        )}
        
        <div className="flex-1">
          <h3 className={hasGeneratedTitle ? 
            'text-lg font-semibold text-gray-900' : 
            'text-base font-medium text-gray-700'
          }>
            {displayTitle}
          </h3>
          
          {hasGeneratedTitle && (
            <p className="text-sm text-gray-500 mt-1">
              {response.model}
            </p>
          )}
          
          <time className="text-xs text-gray-400 mt-2">
            {formatTimestamp(response.createdAt)}
          </time>
        </div>
      </div>
    </div>
  );
};
```

**Run test again**: `pnpm test tests/integration/components/ResponseListItem.test.tsx`  
**Expected**: ✅ PASS

**Commit**: `git commit -m "feat: add title display with loading states (US1 P1)"`

---

## For Users

### How to Use (After Implementation)

**1. Automatic Title Generation** (Default: Enabled)

When you make an LLM call:
1. Response appears immediately (as before)
2. Small loading indicator appears on the response in history
3. Within ~5-30 seconds, a descriptive title appears
4. Title helps you identify the response without clicking

**Example**:
```
Before: gemma3 | 10:30 AM
After:  React Component Best Practices | 10:30 AM
        gemma3 | 10:30 AM
```

**2. Configure Title Generation** (Settings → LLM → Title Generation)

- **Enable/Disable**: Toggle title generation on/off
- **Model Selection**: Choose which model generates titles (can be different from main model)
- **Timeout**: Set how long to wait before giving up (10-120 seconds)

**Tip**: Use a faster, cheaper model for title generation (e.g., `gemma3:1b` instead of `gpt-4`)

**3. Multi-Language Support**

Titles are automatically generated in the same language as your response:
- English response → English title
- Korean response → Korean title
- Japanese response → Japanese title

No configuration needed!

---

## Quick Reference

### Test Commands

```bash
# Run all tests
pnpm test

# Run title generation tests only
pnpm test title

# Watch mode for TDD
pnpm test:watch

# Run specific test file
pnpm test tests/integration/title-generation-flow.test.ts

# Check test coverage
pnpm test --coverage
```

### Build Commands

```bash
# Build application
pnpm build

# Run in development mode
pnpm dev

# Lint and format
pnpm lint
pnpm format
```

### Common Issues

**Issue**: Test fails with "Title generation timeout"  
**Solution**: Increase timeout in test or check if LLM provider is running

**Issue**: Title not appearing in UI  
**Solution**: Check IPC event listener is registered, verify `llm:title:status` events are firing

**Issue**: Title generation blocks main response  
**Solution**: Verify title generation happens in post-processing hook, not before response display

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Renderer Process (React)               │
│                                                         │
│  ┌─────────────────┐         ┌──────────────────────┐ │
│  │ ResponseListItem│◄────────┤   useLLMStore        │ │
│  │  - Show title   │         │  - Title state       │ │
│  │  - Loading icon │         │  - Loading map       │ │
│  └─────────────────┘         └──────────────────────┘ │
│           ▲                            ▲               │
└───────────┼────────────────────────────┼───────────────┘
            │                            │
       IPC Events                   IPC Invoke
  'llm:title:status'            'llm:title:config:*'
            │                            │
┌───────────▼────────────────────────────▼───────────────┐
│                   Main Process (Node.js)               │
│                                                        │
│  ┌────────────────────────┐   ┌─────────────────────┐│
│  │ TitleGenerationService │───┤  RequestQueue       ││
│  │  - Generate title      │   │  - Post-processing  ││
│  │  - LLM prompts         │   │  - Sequential exec  ││
│  └────────────────────────┘   └─────────────────────┘│
│            │                           │              │
│            ▼                           ▼              │
│  ┌────────────────────┐   ┌──────────────────────┐  │
│  │ LLMStorageService  │   │  Provider (Ollama/   │  │
│  │  - Save title      │   │  OpenAI/Gemini)      │  │
│  │  - SQLite + MD     │   │  - Call LLM API      │  │
│  └────────────────────┘   └──────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

**Status**: Quickstart complete. Provides TDD examples, user guide, and architecture overview. Implementation plan ready for execution!
