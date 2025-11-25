# Feature Specification: Automatic LLM Response Title Generation

**Feature Branch**: `004-llm-response-titles`  
**Created**: 2025-11-25  
**Status**: Draft  
**Input**: User description: "Add automatic title generation for LLM call responses to make response history more scannable"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Title Generation (Priority: P1)

As a Promptory user, when I make an LLM call and receive a response, I want the system to automatically generate a descriptive title for that response so I can quickly identify it in my response history without having to click into each response.

**Why this priority**: This is the core feature that solves the scannability problem. Without automatic title generation, users continue to face the same difficulty distinguishing between responses in their history. This is the MVP that delivers immediate value.

**Independent Test**: Can be fully tested by making an LLM call, waiting for title generation to complete, and verifying the response appears in the history list with a descriptive title instead of just the model name.

**Acceptance Scenarios**:

1. **Given** I have made an LLM call with a prompt about React components, **When** the response is received and saved, **Then** the system automatically generates a title in the background and the history item displays a loading indicator
2. **Given** title generation is in progress for a response, **When** the title is successfully generated, **Then** the history list item updates to show the generated title prominently (e.g., "React Component Best Practices") with the model name displayed as secondary info below or in smaller text
3. **Given** I have multiple responses in my history, **When** I view the response list, **Then** each response shows its generated title prominently making it easy to distinguish between different conversations at a glance, with model names visible as secondary metadata
4. **Given** I close and reopen the application, **When** I view my response history, **Then** all previously generated titles are still displayed prominently (titles persist across sessions)

---

### User Story 2 - Configurable Title Generation Settings (Priority: P2)

As a Promptory user, I want to configure which model is used for title generation and enable/disable this feature so I can control costs and customize the behavior to my preferences.

**Why this priority**: Configuration is important for user control but the feature is still valuable with default settings. Users can start using automatic titles immediately with sensible defaults, then customize later if needed.

**Independent Test**: Can be tested by opening settings, changing title generation configuration (model selection, enable/disable toggle, timeout), making LLM calls, and verifying the configured behavior is applied.

**Acceptance Scenarios**:

1. **Given** I am in the settings panel, **When** I navigate to LLM configuration, **Then** I see options to configure title generation including enable/disable toggle, model selection, and timeout setting
2. **Given** I select a different model for title generation than my main responses, **When** I make an LLM call, **Then** the title is generated using the configured title generation model, not the main response model
3. **Given** I disable title generation in settings, **When** I make an LLM call, **Then** no title generation occurs and responses appear with model name only (as they did before this feature)
4. **Given** I set a custom timeout for title generation, **When** title generation exceeds that timeout, **Then** the system abandons title generation and falls back to showing the model name

---

### User Story 3 - Graceful Failure Handling (Priority: P3)

As a Promptory user, when title generation fails (network error, timeout, model unavailable), I want the response to still be fully accessible with a fallback display so the failure doesn't interrupt my workflow.

**Why this priority**: Failure handling is important for robustness but less critical than the core functionality. Users can still use the application even if title generation occasionally fails, as it gracefully falls back to the previous behavior.

**Independent Test**: Can be tested by simulating various failure scenarios (network disconnect, model timeout, provider error) and verifying the response remains accessible with fallback display.

**Acceptance Scenarios**:

1. **Given** title generation is in progress, **When** the title generation request times out, **Then** the loading indicator disappears and the history item displays the model name as a fallback
2. **Given** title generation encounters an error (network failure, model unavailable), **When** the error occurs, **Then** the system logs the error, stops attempting title generation, and displays the model name without showing an error to the user
3. **Given** the title generation service is unavailable, **When** I make an LLM call, **Then** my main response is saved and displayed immediately without delay, with model name shown in history
4. **Given** a response has fallback display due to failed title generation, **When** I view the response history, **Then** there is a subtle visual indicator (e.g., icon) that distinguishes auto-titled responses from fallback responses

---

### Edge Cases

- **Short responses (<20 words)**: System attempts title generation regardless of length. If generation fails or produces poor results, the short response text itself is used as the title.
- **Response editing**: Response editing is not supported in the application. Markdown files are human-readable only; manual edits won't trigger title regeneration. Generated titles remain unchanged after initial creation.
- **Rapid-fire LLM calls**: Title generation happens sequentially after each main LLM response completes. Pattern: LLM call #1 → title generation #1 → LLM call #2 → title generation #2. Title generation is considered part of the parent LLM call; user sees only main response call count, not separate title generation count. Next main LLM call waits for previous title generation to complete.
- **Non-English content**: Title generation produces titles in the same language as the response content. The LLM auto-detects or mirrors the input language to maintain consistency and readability.
- **Long generated titles (>100 characters)**: System truncates to 100 characters with ellipsis (...) for display. Full titles up to 150 characters stored in database/markdown but display always limited to 100 characters.
- **Malformed title responses**: If title generation returns an error response or non-title content (e.g., LLM returns explanation instead of title), system falls back to model name display and logs the issue.
- **Disabled title generation with existing titles**: Previously generated titles remain displayed; disabling only prevents generation for new responses.

## Clarifications

### Session 2025-11-25

- Q: When the response content is too short (e.g., single word or <20 words), what should happen with title generation? → A: Attempt title generation regardless of length, use the short response text itself as the title if generation fails or produces poor results
- Q: When a response has both a generated title and the model name, how should they be displayed in the history list? → A: Show generated title prominently, with model name as secondary info (e.g., subtitle or smaller text)
- Q: When a user edits/modifies a saved response after it already has a generated title, what should happen? → A: Response editing is not supported in the application. Markdown files are human-readable only; manual edits won't trigger title regeneration
- Q: When a user makes rapid-fire LLM calls (10+ calls in quick succession), how should the title generation queue behave? → A: Title generation happens sequentially after each main LLM response (LLM call #1 → title #1 → LLM #2 → title #2). Title generation is part of the parent LLM call from user's perspective; display shows only main response call count
- Q: When response content is in a non-English language (e.g., Korean, Japanese, Spanish), how should title generation behave? → A: Generate titles in the same language as the response content (LLM auto-detects or mirrors input language)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically trigger title generation immediately after saving a new LLM response
- **FR-002**: System MUST execute title generation sequentially after each main LLM response completes (blocking next queued LLM call until title generation finishes), but must not block the display of the completed main response content to the user
- **FR-003**: System MUST use a separately configured model/provider for title generation (not necessarily the same as the main response model)
- **FR-004**: System MUST generate titles that are 5-8 words in length, descriptive, and based on the response content
- **FR-005**: System MUST store generated titles in both the SQLite database and markdown file frontmatter to maintain the hybrid storage pattern
- **FR-006**: System MUST display a loading indicator on response history items while title generation is in progress
- **FR-007**: System MUST update the history list display automatically when a title is successfully generated
- **FR-008**: System MUST persist generated titles across application restarts
- **FR-009**: Users MUST be able to enable or disable title generation entirely via settings
- **FR-010**: Users MUST be able to select which model/provider to use for title generation in settings
- **FR-011**: Users MUST be able to configure a timeout for title generation (with 30 seconds as default)
- **FR-012**: System MUST gracefully handle title generation failures by falling back to displaying the model name
- **FR-013**: System MUST NOT show user-facing error messages when title generation fails (log errors silently)
- **FR-014**: System MUST support title generation for responses from all supported providers (Ollama, OpenAI, Gemini)
- **FR-015**: System MUST truncate excessively long generated titles (>100 characters) to a reasonable display length with ellipsis (...). Full titles stored up to 150 characters in database/markdown; display limited to 100 characters.
- **FR-016**: System MUST treat title generation as part of the parent LLM call workflow; display counters and queues show only main response calls, not title generation calls separately

### Key Entities

- **ResponseTitle**: A short descriptive text (5-8 words) automatically generated from response content. Attributes: title text (string, max 150 characters), generation status (pending/completed/failed), generation timestamp, generated by which model, associated response ID
- **TitleGenerationConfig**: User preferences for title generation feature. Attributes: enabled (boolean), selected model ID, selected provider, timeout duration (seconds), fallback behavior preference
- **ResponseMetadata**: Extended to include title information. Attributes: existing response metadata plus generated title, title generation status, title generation timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can distinguish between different LLM responses in their history without clicking into each response (validated by user testing)
- **SC-002**: Title generation completes within 30 seconds for 95% of responses (measured by generation timestamps logged in TitleGenerationService - see T024a)
- **SC-003**: Title generation failure rate is below 5% under normal network conditions (measured by success/failure logs)
- **SC-004**: Response history remains scannable with 10+ responses visible, each identifiable by its generated title (validated by UI testing)
- **SC-005**: Main response display is never blocked or delayed by title generation (measured by response save to display time remaining unchanged)
- **SC-006**: Generated titles accurately reflect response content in 90%+ of cases (validated by user feedback and manual review)
- **SC-007**: Users can configure title generation settings in under 1 minute (validated by usability testing)
- **SC-008**: Title generation works consistently across all three supported providers (validated by integration testing)

## Assumptions

- Title generation prompts will be crafted to produce concise, descriptive titles from the first ~500 characters of response content
- Users will generally prefer faster, cheaper models for title generation compared to their main response models
- A 30-second default timeout is reasonable for title generation based on typical model response times
- Most responses will contain sufficient content (>20 words) to generate a meaningful title
- Title generation accuracy improves with more sophisticated models, but even basic models provide value over no titles
- Users will occasionally want to manually edit generated titles (future enhancement, not in this feature)
- Response history typically contains 10-50 recent responses, making scannability important
