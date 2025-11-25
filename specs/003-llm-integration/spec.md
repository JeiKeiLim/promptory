# Feature Specification: Direct LLM Integration for Prompts

**Feature Branch**: `003-llm-integration`  
**Created**: 2025-11-19  
**Status**: Draft  
**Input**: User description: "프롬프트 사용시, LLM을 직접 호출할 수 있는 기능 추가"

## Clarifications

### Session 2025-11-19

- Q: Where should LLM responses be displayed in the UI to support fast iterative workflow (changing parameters and running multiple LLM calls quickly)? → A: Side panel slides in from right showing list of LLM results (like chat history, newest at top). ParameterInputModal stays open and non-blocking during LLM calls. Each result in side panel shows: timestamp, parameters used, truncated response, copy button. Clicking a result from side panel → ParameterInputModal expands/changes to show full response (replaces parameter inputs temporarily). "Back to Parameters" button returns to parameter input view. "Back to Prompt" button in side panel returns focus to ParameterInputModal. Multiple LLM calls can run concurrently or queue while user continues working.
- Q: Should multiple LLM API calls execute concurrently (parallel) or sequentially (queued)? → A: Sequential queue (FIFO order). Requests execute one at a time. Show queue position for pending requests in side panel.
- Q: Which storage mechanism should be used for cloud provider API credentials (OpenAI, Azure, Gemini)? → A: Electron safeStorage API (uses OS-level keychain: macOS Keychain, Windows Credential Vault, Linux Secret Service).
- Q: Should streaming responses (displaying tokens as they arrive) be implemented in the MVP? → A: No, defer to post-MVP. MVP will wait for complete response before displaying. Streaming can be added later as enhancement.
- Q: For Ollama MVP, should users select model from a list or configure it in settings? → A: One-time configuration in settings. When user selects Ollama as provider in settings, display text edit component where user manually types model name (default value: "gemma3"). No model dropdown in MVP.
- Q: What happens to side panel and in-progress API calls when user closes ParameterInputModal? → A: Side panel is attached to modal - both close together. Results are preserved and restored when reopening same prompt. If API call completes while modal closed, badge indicator appears on prompt item in list view. Badge shows number of new responses ready. Additionally, show indicator of how many queued API calls are in progress globally.
- Q: Can user delete LLM results? → A: Yes, both individual delete (delete button on each result with confirmation) and "Clear All Results" button to delete all results for current prompt at once.
- Q: Will LLM results from each prompt be managed separately? → A: Yes, each prompt has isolated result history. Opening Prompt A shows only A's results, opening Prompt B shows only B's results. Results are stored and managed per prompt.
- Q: Where do the results of LLM calls reside? → A: Hybrid storage - SQLite database stores metadata (prompt ID, timestamp, parameters, token usage, status) for fast querying, and file system stores full response content as `.md` files in `.promptory/llm_results/{prompt-id}/{response-id}.md` for human readability and transparency. If user manually deletes .md file, system filters out that entry from display (real-time file existence check) and background cleanup removes orphaned SQLite entries.
- Q: Should there be separate indicators for new results vs. queued calls? → A: Yes, two separate indicators: (1) Per-prompt badge on list items showing "N new results ready" (clears when user opens that prompt's modal and views side panel), (2) Global indicator (e.g., app header/status bar) showing "N queued calls" (clears when queue is empty).
- Q: How should users cancel pending/ongoing LLM requests? → A: Global "Cancel All" button in the global queue indicator area that cancels ALL requests across all prompts (including currently running request and all pending requests in queue).
- Q: Should API call timeout be configurable? → A: Yes, per-provider configurable timeout in settings (default: 120 seconds). Ollama can take much longer on slower machines than cloud APIs, so each provider needs independent timeout configuration.
- Q: What happens to in-progress or queued LLM requests when user quits the app? → A: On graceful app close, cancel all pending/in-progress requests (completed responses already saved). On app launch, check for any orphaned queue state (from unexpected kill/crash) and clear it. Queue state is in-memory only, not persisted to disk.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic LLM Call with Ollama (Priority: P1) 🎯 MVP

Users can execute prompts directly by calling a local Ollama LLM instance and receiving responses within the application, eliminating the need to copy-paste prompts to external LLM interfaces.

**Why this priority**: This is the core value proposition - enabling users to test and use prompts without leaving the application. Ollama is chosen as the MVP provider because it's local, free, doesn't require API keys, and has no usage costs, making it ideal for initial testing and development. Provides immediate, actionable value even without other features.

**Independent Test**: User can configure Ollama server URL (default: http://localhost:11434), click "Call LLM" button on any prompt, and receive a response displayed in the application. This delivers complete end-to-end value without requiring any other user stories.

**Acceptance Scenarios**:

1. **Given** user has Ollama running locally and configured the server URL, **When** user clicks "Use Prompt" button and then "Call LLM" button, **Then** prompt is sent to Ollama API and response is displayed below the prompt preview
2. **Given** user has not configured Ollama or Ollama is not running, **When** user clicks "Call LLM" button, **Then** system displays helpful message explaining how to install/start Ollama with direct link to settings
3. **Given** LLM is processing request, **When** response is being generated, **Then** system displays loading indicator with cancel option
4. **Given** Ollama API returns error (connection refused, model not found, timeout), **When** error occurs, **Then** system displays user-friendly error message with troubleshooting guidance specific to Ollama

---

### User Story 2 - Parameter Input and Substitution (Priority: P2)

Users can input values for prompt parameters before calling the LLM, ensuring the final prompt sent to the API has all required values substituted correctly.

**Why this priority**: Essential for prompts with parameters (common use case). Builds directly on US1 by making it practical for parameterized prompts. Still valuable independently as it enhances the existing parameter input modal.

**Independent Test**: User can open parameter input modal, fill in all required parameters, and see them properly substituted in the preview before calling LLM. Can test even without actual API call.

**Acceptance Scenarios**:

1. **Given** prompt contains parameters like `{{name}}` or `{{topic}}`, **When** user clicks "Use Prompt", **Then** system displays parameter input modal with all detected parameters
2. **Given** user has filled in all required parameters, **When** user clicks "Call LLM", **Then** system substitutes all parameter placeholders with user-provided values before sending to API
3. **Given** user has not filled in required parameters, **When** user attempts to call LLM, **Then** system prevents API call and highlights missing parameters
4. **Given** prompt has optional parameters with defaults, **When** user leaves optional parameters empty, **Then** system uses default values in the final prompt

---

### User Story 3 - Cloud LLM Provider Support (Priority: P2)

Users can add cloud LLM providers (OpenAI, Azure OpenAI, Gemini) in addition to the default Ollama support, allowing flexibility based on requirements for more powerful models, specific capabilities, or cloud-based workflows.

**Why this priority**: Important for users who need access to more powerful cloud models or have specific provider preferences. Each cloud provider can be tested independently by configuring its credentials and making API calls. Builds on US1 (Ollama) by adding cloud alternatives.

**Independent Test**: User can add API credentials for OpenAI, select it as active provider, and successfully call OpenAI's API. Can verify by checking response metadata shows OpenAI model was used. Each cloud provider integration can be tested and deployed independently.

**Acceptance Scenarios**:

1. **Given** user opens LLM settings, **When** user views provider options, **Then** system displays list of supported providers with Ollama (default) plus OpenAI, Azure OpenAI, and Gemini as optional cloud providers
2. **Given** user selects a cloud provider (OpenAI/Azure/Gemini), **When** user enters credentials for that provider, **Then** system validates credentials and saves configuration securely
3. **Given** multiple providers are configured (Ollama + cloud providers), **When** user calls LLM, **Then** system uses the currently selected active provider
4. **Given** user switches from Ollama to a cloud provider, **When** user calls LLM again, **Then** system uses the newly selected cloud provider without re-configuration

---

### User Story 4 - Advanced Model Selection and Management (Priority: P3)

Users can select models from a dropdown list (auto-detected from provider), mark favorites, and switch models dynamically instead of manually typing model names in settings.

**Why this priority**: Enhances flexibility for power users who want to optimize for cost, speed, or capability. MVP already supports basic model configuration (manual text entry), but this adds convenience features like auto-detection and quick switching.

**Independent Test**: User can view dropdown of auto-detected Ollama models (or cloud provider models), select one, mark favorites, and switch between them without going to settings. Can test by verifying API request logs show correct model parameter.

**Acceptance Scenarios**:

1. **Given** user has Ollama running, **When** user opens model dropdown, **Then** system auto-detects and displays list of available Ollama models (pulled locally)
2. **Given** user selects a model from dropdown, **When** user calls LLM, **Then** system uses the selected model instead of settings default
3. **Given** user has set a global default model, **When** user calls LLM without changing dropdown, **Then** system uses configured default from settings
4. **Given** user has favorite models marked, **When** user views model dropdown, **Then** favorites appear at top of list for quick access

---

### User Story 5 - Response Management (Priority: P3)

Users can interact with LLM responses effectively by copying response text, viewing response history, and regenerating responses with different parameters or providers.

**Why this priority**: Quality-of-life improvement that makes the feature more practical for daily use. Not blocking for basic functionality but significantly improves usability.

**Independent Test**: User can receive LLM response, click copy button to copy text, view history of past responses, and regenerate without re-entering parameters.

**Acceptance Scenarios**:

1. **Given** LLM has returned a response, **When** user clicks "Copy" button, **Then** response text is copied to clipboard and user sees confirmation
2. **Given** user has made multiple LLM calls, **When** user opens response history, **Then** system displays list of recent responses with timestamps and prompts used
3. **Given** user wants to retry with different settings, **When** user clicks "Regenerate", **Then** system keeps parameter values and allows changing provider or model before calling again
4. **Given** response history is full, **When** system needs to store new response, **Then** oldest responses are removed to maintain performance

---

### Edge Cases

- What happens when API call takes longer than configured timeout (default: 120 seconds per provider)? System shows timeout error with option to retry or adjust timeout in settings. Timeout is configurable per provider to accommodate Ollama (slower on local machines) vs cloud APIs
- How does system handle partial/streaming responses? MVP waits for complete response (no streaming). Post-MVP enhancement will display tokens incrementally as they arrive
- What happens when user has insufficient API credits or quota exceeded? System displays clear error with provider-specific guidance
- How does system handle network interruption during API call? System detects disconnection, shows error, and allows retry
- What happens when prompt + parameters exceed model's token limit? System validates before API call and warns user with character count
- How does system handle special characters or formatting in responses? System preserves markdown, code blocks, and formatting from LLM response
- What happens when user switches prompts while LLM is processing? System continues request in background; results preserved per prompt
- What happens when user closes ParameterInputModal while LLM call is in progress? System continues API call in background, displays per-prompt badge indicator on prompt item when complete
- What happens when per-prompt badge shows "3 new results ready" and user opens modal? Badge clears immediately upon opening modal and viewing side panel (user has acknowledged new results)
- What happens when user clicks "Cancel All" while multiple prompts have queued requests? All requests across all prompts are cancelled (including currently running and all pending), global queue indicator clears
- What happens when user deletes a result that is currently displayed in full view? System closes full view and returns to parameter input view
- What happens when user manually deletes .md file from `.promptory/llm_results/` directory? System filters out that entry from side panel display (real-time file existence check); background cleanup removes orphaned SQLite metadata on app start
- What happens when SQLite entry exists but .md file is missing? System skips that entry when rendering side panel (clean list, no error shown); orphaned SQLite entry cleaned up in background
- What happens when .md file exists but no SQLite entry? System ignores the file (only shows results that exist in SQLite index to prevent confusion from stray files)
- How does system handle multiple API calls submitted rapidly? System queues requests in FIFO order and processes them sequentially (one at a time), showing queue position (e.g., "2 of 3") for pending requests
- What happens when API credentials become invalid (expired token, revoked key)? System detects auth errors and prompts user to update credentials
- What happens when user quits app while LLM requests are pending or in-progress? On graceful quit, system cancels all pending/in-progress requests (completed responses already saved). On app launch, system checks for orphaned queue state (from unexpected kill/crash) and clears it. Queue state is in-memory only, not persisted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support Ollama as the default/primary LLM provider with configurable server URL (default: http://localhost:11434)
- **FR-002**: System MUST securely store cloud provider API credentials using Electron safeStorage API (which uses OS-level keychain: macOS Keychain, Windows Credential Vault, Linux Secret Service) - not needed for local Ollama
- **FR-003**: System MUST display "Call LLM" button in the parameter input modal alongside existing "Copy to Clipboard" button
- **FR-004**: System MUST validate that Ollama is accessible or cloud provider credentials are configured before allowing LLM calls
- **FR-005**: System MUST substitute all prompt parameters with user-provided values before sending to LLM API
- **FR-006**: System MUST display LLM responses in a side panel that slides in from the right, showing a list of results with truncated content, timestamp, parameters used, and copy button for each result
- **FR-007**: System MUST keep ParameterInputModal open and non-blocking when user initiates LLM calls, allowing immediate parameter changes and additional calls
- **FR-008**: System MUST expand ParameterInputModal to show full response when user clicks a result from the side panel, with "Back to Parameters" button to return to parameter input view
- **FR-009**: System MUST provide "Back to Prompt" button in side panel to return focus to ParameterInputModal
- **FR-010**: System MUST attach side panel to ParameterInputModal (both open and close together as integrated unit)
- **FR-011**: System MUST preserve LLM results when modal closes and restore them when reopening same prompt
- **FR-012**: System MUST continue in-progress API calls in background even when modal is closed
- **FR-013**: System MUST display per-prompt badge on prompt items in list view showing "N new results ready" when API completes while modal closed
- **FR-014**: System MUST clear per-prompt badge when user opens that prompt's ParameterInputModal and views side panel
- **FR-015**: System MUST show global queue indicator (e.g., in app header/status bar) displaying "N queued calls" for all in-progress and pending requests
- **FR-016**: System MUST clear global queue indicator when queue is empty (no pending or in-progress calls)
- **FR-017**: System MUST provide "Cancel All" button in global queue indicator area that cancels all requests across all prompts
- **FR-018**: System MUST cancel currently running request and all pending queued requests when "Cancel All" is clicked
- **FR-019**: System MUST show loading indicator during API call with elapsed time counter in the side panel result list (format: "MM:SS" or "Xm Ys" - implementation choice)
- **FR-020**: System MUST allow users to cancel individual in-progress API calls from the side panel
- **FR-021**: System MUST process LLM API calls sequentially in FIFO queue order (one at a time) while ParameterInputModal remains interactive, displaying queue position for pending requests
- **FR-022**: System MUST display user-friendly error messages for common API failures (connection refused for Ollama, auth/rate limit/network for cloud providers)
- **FR-023**: System MUST provide "Copy" button for LLM responses to copy text to clipboard (both in side panel list and full response view)
- **FR-024**: System MUST support Ollama (MVP), OpenAI, Azure OpenAI, and Google Gemini providers
- **FR-025**: System MUST allow users to select active LLM provider from configured options (Ollama + any configured cloud providers)
- **FR-026**: System MUST provide per-provider configurable timeout setting (default: 120 seconds) to accommodate different provider performance characteristics
- **FR-027**: System MUST provide text input field in settings for Ollama model name configuration (default: "gemma3") as one-time setup
- **FR-028**: System MUST use the configured model name for all Ollama API calls until user changes it in settings
- **FR-029**: System MUST validate model name format (alphanumeric, lowercase, hyphens allowed) before saving
- **FR-030**: System MUST display token usage and estimated cost (when available from provider) after each API call in side panel result items and expanded response view
- **FR-031**: System MUST preserve parameter values when user regenerates response with different settings
- **FR-032**: System MUST store response history with timestamps isolated per prompt (each prompt has its own independent result history)
- **FR-033**: System MUST use hybrid storage: SQLite database for metadata (prompt ID, timestamp, parameters, token usage, status, file path) and file system for full response content
- **FR-034**: System MUST save response content as Markdown files in `.promptory/llm_results/{prompt-id}/{response-id}.md` for human readability
- **FR-035**: System MUST perform real-time file existence checks when rendering side panel and filter out entries with missing .md files
- **FR-036**: System MUST run background cleanup on app start to remove orphaned SQLite entries (metadata without corresponding .md file)
- **FR-037**: System MUST provide individual delete button on each result in side panel with confirmation dialog (deletes both SQLite entry and .md file)
- **FR-038**: System MUST provide "Clear All Results" button to delete all results for current prompt at once with confirmation dialog (deletes both SQLite entries and all .md files for that prompt)
- **FR-039**: System MUST wait for complete response before displaying (streaming deferred to post-MVP enhancement)
- **FR-040**: System MUST validate prompt + parameters length against model token limits before API call (uses 80% of model's stated token limit as conservative threshold per Assumption #10)
- **FR-041**: System MUST handle markdown formatting, code blocks, and special characters in LLM responses correctly
- **FR-042**: System MUST cancel all pending and in-progress LLM requests when app is gracefully closed (before-quit event)
- **FR-043**: System MUST check for and clear any orphaned queue state on app launch (handles unexpected kills/crashes)
- **FR-044**: System MUST mark any in-progress requests in SQLite as 'cancelled' on app quit (if status was 'pending')

### Key Entities

- **LLM Provider Configuration**: Represents a configured LLM provider with authentication credentials, base URL (for Azure/Ollama), timeout setting (default: 120 seconds), active status, and last validated timestamp
- **Model Definition**: Represents an available model for a provider including model ID, display name, context window size, cost per token, and capabilities (streaming, function calling)
- **LLM Request**: Represents a single API call including source prompt ID (links to specific prompt), substituted parameters, selected provider and model, timestamp, and request status (pending, completed, failed, cancelled). Stored in SQLite.
- **LLM Response**: Represents API response with hybrid storage: SQLite stores metadata (response ID, prompt ID, timestamp, token usage, cost, response time, file path, status) and file system stores full response content as Markdown at `.promptory/llm_results/{prompt-id}/{response-id}.md`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete entire workflow from opening prompt to receiving LLM response in under 30 seconds (excluding actual LLM processing time)
- **SC-002**: 95% of valid API calls successfully return responses or meaningful error messages
- **SC-003**: Users can configure and start using the feature within 5 minutes of first opening LLM settings
- **SC-004**: System handles at least 10 concurrent users making API calls without performance degradation
- **SC-005**: Response display correctly renders 100% of markdown formatting and code blocks from LLM responses
- **SC-006**: 90% of users successfully complete parameter input and LLM call on first attempt without errors or confusion
- **SC-007**: System detects and reports 100% of common API error conditions with actionable user guidance
- **SC-008**: Token usage tracking is accurate within 5% of provider-reported usage
- **SC-009**: Response history maintains performance with up to 1000 stored responses per prompt (isolated per prompt)
- **SC-010**: Users can switch between providers and complete API calls without needing to reconfigure settings

## Dependencies *(include if feature relies on other systems)*

### External Dependencies

- **Ollama** (local or remote instance) - PRIMARY/MVP provider, requires Ollama server running (default: localhost:11434), free and local, no API keys needed
- **OpenAI API** (api.openai.com) - OPTIONAL cloud provider, requires API key, subject to rate limits and usage costs
- **Azure OpenAI Service** (azure.microsoft.com) - OPTIONAL cloud provider, requires subscription, endpoint URL, and API key
- **Google Gemini API** (ai.google.dev) - OPTIONAL cloud provider, requires API key, different authentication flow

### Internal Dependencies

- Existing parameter input modal system - must be extended to include LLM call functionality
- Existing prompt rendering system - must be extended to display LLM responses
- Application settings system - must store LLM provider configurations securely
- Clipboard API - used for copying responses
- Existing SQLite database - must be extended with new tables for LLM requests/responses metadata
- File system service - must handle `.promptory/llm_results/` directory creation and .md file I/O

## Assumptions *(include if you're making assumptions about unclear aspects)*

1. **Default Provider**: Ollama will be the default/primary provider (local, free, no API keys needed) with cloud providers as optional additions
2. **Ollama Availability**: Users who want to use Ollama will install and run it locally before using this feature
3. **Security**: Cloud provider API credentials will be stored using Electron's safeStorage API (which automatically uses OS-level keychain), never in plain text files
4. **Network**: Users need localhost connection for Ollama or stable internet connection for cloud API calls
5. **Cost Management**: Users are responsible for managing their own cloud API costs and rate limits; application will display usage but not enforce limits
6. **Model Selection**: For Ollama MVP, users manually configure model name in settings (default: "gemma3"). Advanced model selection UI (dropdown, auto-detection, favorites) deferred to User Story 4 (P3)
7. **Response Format**: LLM responses are plain text or markdown; binary/image responses not in initial scope
8. **Streaming**: Streaming responses explicitly deferred to post-MVP; MVP implementation will wait for complete response before displaying
9. **History Storage**: Response history uses hybrid storage - SQLite database for metadata (fast querying) and file system for response content (`.promptory/llm_results/{prompt-id}/{response-id}.md` for human readability and transparency), isolated per prompt, not synced across devices
10. **Token Limits**: System will use conservative estimates (80% of stated limits) when validating prompt length for cloud providers
11. **Error Handling**: Temporary failures (network issues, Ollama not running, rate limits) will allow retry; permanent failures (invalid credentials) will require user intervention
12. **Ollama Models**: Users manage their own Ollama models (pull/download) using Ollama CLI; MVP requires manual model name entry in settings (default: "gemma3"); auto-detection deferred to US4 (P3)

## Constraints *(include if there are limitations)*

### Technical Constraints

- Must work within Electron desktop application framework
- Cannot make API calls from main process (security); must use renderer process with IPC
- Response history limited to 1000 most recent entries per prompt to maintain performance (each prompt has isolated result history)
- Cannot store API credentials in git-tracked configuration files
- Response content stored as `.md` files for transparency (aligns with File-Based Transparency principle), SQLite used for metadata indexing only

### Business Constraints

- Feature must not store or log actual cloud provider API credentials (Ollama has no credentials)
- Must comply with each provider's terms of service and usage policies
- Cannot include cloud API keys in application; users must provide their own
- Should not encourage excessive cloud API usage that could lead to unexpected costs for users
- Ollama is recommended as the default to avoid costs and provide privacy benefits (local processing)

### User Experience Constraints

- LLM call feature must not interfere with existing "Copy to Clipboard" workflow
- Settings must be easily accessible but not clutter main interface
- Error messages must be helpful without exposing technical details unnecessarily
- Response display must fit within existing application layout without major UI changes

## Out of Scope *(important: explicitly state what's NOT included)*

- Streaming responses (tokens arriving incrementally) - deferred to post-MVP
- Auto-detection of available models from providers - deferred to US4 (P3), MVP uses manual text entry
- Model dropdown/selection UI - deferred to US4 (P3), MVP uses settings configuration
- Fine-tuning or training custom models
- Batch processing of multiple prompts at once
- Caching LLM responses to reduce API costs
- Collaborative features (sharing responses with team members)
- Advanced prompt engineering tools (auto-optimization, A/B testing)
- Integration with prompt sharing/marketplace features
- Mobile application support
- Custom API provider integration (beyond the four specified providers)
- Function calling or tool use capabilities
- Multi-turn conversations (each call is independent)
- Response comparison tools (comparing outputs from different models)
- Cost budgeting or spending limits
- Scheduled or automated prompt execution
