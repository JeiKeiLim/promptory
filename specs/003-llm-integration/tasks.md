# Tasks: Direct LLM Integration for Prompts

**Input**: Design documents from `/specs/003-llm-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Approach**: Test-Driven Development (TDD) - Tests are written FIRST, watched to FAIL, then implementation makes them PASS.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [X] T001 Install new dependencies: `openai`, `@google/generative-ai` packages using pnpm
- [X] T002 [P] Create shared types directory structure for LLM types in `src/shared/types/llm.ts`
- [X] T003 [P] Define TypeScript interfaces for LLMProviderType, LLMRequestStatus, LLMProviderConfig, LLMRequest, LLMResponseMetadata, LLMResponse in `src/shared/types/llm.ts`
- [X] T004 [P] Create IPC channel constants in `src/shared/constants/ipcChannels.ts` (add LLM channels)
- [X] T005 Create SQLite schema migrations for provider_configurations and llm_responses tables in `src/main/database/schema.sql`
- [X] T006 Create LLM results directory structure: `.promptory/llm_results/` with proper permissions
- [X] T007 [P] Update i18n translation files with LLM-related keys in `src/renderer/i18n/locales/` (ko.json, en.json, ja.json)
- [ ] T008 Configure Vitest to support main process testing (with node environment) in `vitest.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**TDD Note**: Write tests first, watch them FAIL, then implement to make them PASS

### 2.1 Storage Layer Tests

- [X] T009 [P] Write unit tests for LLMStorageService provider CRUD in `tests/unit/services/LLMStorageService.test.ts`
- [X] T010 [P] Write unit tests for LLMStorageService response metadata CRUD in `tests/unit/services/LLMStorageService.test.ts`
- [X] T011 [P] Write unit tests for file system operations (.md save/read/delete) in `tests/unit/services/LLMStorageService.test.ts`
- [X] T011.5 [P] Write unit tests for PathValidator integration in file operations (validate .promptory/llm_results/ paths) in `tests/unit/services/LLMStorageService.test.ts`
- [X] T012 [P] Write unit tests for orphaned entry cleanup logic in `tests/unit/services/LLMStorageService.test.ts`
- [ ] T013 [P] Write unit tests for per-prompt limit enforcement (1000 max) in `tests/unit/services/LLMStorageService.test.ts`

### 2.2 Storage Layer Implementation

- [X] T014 Create LLMStorageService skeleton in `src/main/services/LLMStorageService.ts` (tests should FAIL)
- [X] T015 Implement provider CRUD methods in LLMStorageService (make T009 PASS)
- [X] T016 Implement response metadata CRUD methods in LLMStorageService (make T010 PASS)
- [X] T017 Implement file system operations in LLMStorageService (make T011 PASS)
- [X] T017.5 Integrate PathValidator to validate all file paths when creating/accessing .promptory/llm_results/ directories (make T011.5 PASS)
- [X] T018 Implement orphaned entry cleanup logic in LLMStorageService (make T012 PASS)
- [ ] T019 Implement per-prompt response limit enforcement in LLMStorageService (make T013 PASS)

### 2.3 Credential Management Tests

- [X] T020 [P] Write unit tests for CredentialService encrypt/decrypt in `tests/unit/services/CredentialService.test.ts`
- [X] T021 [P] Write unit tests for credential validation in `tests/unit/services/CredentialService.test.ts`

### 2.4 Credential Management Implementation

- [X] T022 Create CredentialService using Electron safeStorage API in `src/main/services/CredentialService.ts` (tests should FAIL)
- [X] T023 Implement encrypt/decrypt methods for API credentials in CredentialService (make T020 PASS)
- [X] T024 Add credential validation checks (isEncryptionAvailable) in CredentialService (make T021 PASS)

### 2.5 Core LLM Service Tests

- [X] T025 [P] Write unit tests for FIFO queue logic (enqueue, dequeue, process) in `tests/unit/services/RequestQueue.test.ts`
- [X] T026 [P] Write unit tests for request cancellation (individual and cancel all) in `tests/unit/services/RequestQueue.test.ts`
- [X] T027 [P] Write unit tests for cleanup on app quit (graceful and crash) - implemented in llmHandlers

### 2.6 Core LLM Service Implementation

- [X] T028 Create base LLMService with queue management skeleton - implemented as RequestQueue + llmHandlers orchestration
- [X] T029 Implement FIFO queue logic (enqueue, dequeue, process) in RequestQueue (make T025 PASS)
- [X] T030 Implement request cancellation (individual and cancel all) in RequestQueue + llmHandlers (make T026 PASS)
- [X] T031 Implement cleanup on app quit in llmHandlers.cleanupOnQuit() (make T027 PASS)
- [X] T032 Add app lifecycle handlers in `src/main/main.ts` (before-quit event to call cleanupOnQuit)

### 2.7 Utility Function Tests

- [X] T033 [P] Write unit tests for parameter substitution utility in `tests/unit/services/ParameterSubstitutionService.test.ts`
- [ ] T034 [P] Write unit tests for prompt length validator in `tests/unit/main/utils/promptValidator.test.ts`
- [X] T035 [P] Write unit tests for token usage calculator in `tests/unit/services/TokenCounter.test.ts`
- [ ] T036 [P] Write unit tests for markdown formatter in `tests/unit/renderer/utils/markdownFormatter.test.ts`

### 2.8 Utility Function Implementation

- [X] T037 [P] Create parameter substitution utility as ParameterSubstitutionService (make T033 PASS)
- [ ] T038 [P] Create prompt length validator utility in `src/main/utils/promptValidator.ts` (make T034 PASS)
- [X] T039 [P] Create token usage calculator as TokenCounter service (make T035 PASS)
- [ ] T040 [P] Create markdown formatter utility in `src/renderer/utils/markdownFormatter.ts` (make T036 PASS)

### 2.9 Zustand Store Tests

- [X] T041 Write unit tests for useLLMStore provider management actions in `tests/unit/renderer/stores/useLLMStore.test.ts`
- [X] T042 Write unit tests for useLLMStore queue state management actions in `tests/unit/renderer/stores/useLLMStore.test.ts`
- [X] T043 Write unit tests for useLLMStore badge counter actions in `tests/unit/renderer/stores/useLLMStore.test.ts`

### 2.10 Zustand Store Implementation

- [X] T044 Create useLLMStore skeleton in `src/renderer/stores/useLLMStore.ts` (tests should FAIL)
- [X] T045 Implement provider management actions in useLLMStore (make T041 PASS)
- [X] T046 Implement queue state management actions in useLLMStore (make T042 PASS)
- [X] T047 Implement badge counter actions in useLLMStore (make T043 PASS)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic LLM Call with Ollama (Priority: P1) 🎯 MVP

**Goal**: Users can execute prompts directly by calling a local Ollama LLM instance and receiving responses within the application

**Independent Test**: User can configure Ollama server URL (default: http://localhost:11434), click "Call LLM" button on any prompt, and receive a response displayed in the application

**TDD Workflow**: Write tests → Watch fail → Implement → Watch pass

### 3.1 Ollama Provider Tests

- [X] T048 [P] [US1] Write unit tests for OllamaProvider validate() method in `tests/unit/services/providers/OllamaProvider.test.ts`
- [X] T049 [P] [US1] Write unit tests for OllamaProvider generate() method in `tests/unit/services/providers/OllamaProvider.test.ts`
- [X] T050 [P] [US1] Write unit tests for OllamaProvider listModels() method in `tests/unit/services/providers/OllamaProvider.test.ts`
- [X] T051 [P] [US1] Write unit tests for Ollama error handling (connection refused, model not found, timeout) in `tests/unit/services/providers/OllamaProvider.test.ts`

### 3.2 Ollama Provider Implementation

- [X] T052 [US1] Create OllamaProvider class skeleton implementing ILLMProvider in `src/main/services/providers/OllamaProvider.ts` (tests should FAIL)
- [X] T053 [US1] Implement validate() method for Ollama connection check in OllamaProvider (make T048 PASS)
- [X] T054 [US1] Implement generate() method for Ollama API call (POST /api/generate) in OllamaProvider (make T049 PASS)
- [X] T055 [US1] Implement listModels() method for Ollama (GET /api/tags) in OllamaProvider (make T050 PASS)
- [X] T056 [US1] Add error handling for Ollama-specific errors in OllamaProvider (make T051 PASS)

### 3.3 Main Process IPC Handler Tests

- [X] T057 [P] [US1] Write integration tests for `llm:provider:save` handler in `tests/integration/ipc/llmHandlers.test.ts` (placeholder)
- [X] T058 [P] [US1] Write integration tests for `llm:provider:setActive` handler in `tests/integration/ipc/llmHandlers.test.ts` (placeholder)
- [X] T059 [P] [US1] Write integration tests for `llm:call` handler with queue in `tests/integration/ipc/llmHandlers.test.ts` (placeholder)
- [X] T060 [P] [US1] Write integration tests for `llm:getHistory` handler in `tests/integration/ipc/llmHandlers.test.ts` (placeholder)
- [X] T061 [P] [US1] Write integration tests for `llm:getResponse` handler in `tests/integration/ipc/llmHandlers.test.ts` (placeholder)

### 3.4 Main Process IPC Handler Implementation

- [X] T062 [US1] Create llmHandlers.ts skeleton in `src/main/handlers/llmHandlers.ts` (tests should FAIL)
- [X] T063 [US1] Implement `llm:provider:save` handler for Ollama configuration in llmHandlers (make T057 PASS)
- [X] T064 [US1] Implement `llm:provider:setActive` handler in llmHandlers (make T058 PASS)
- [X] T065 [US1] Implement `llm:call` handler with queue integration in llmHandlers (make T059 PASS)
- [X] T066 [US1] Implement `llm:getHistory` handler to fetch response metadata in llmHandlers (make T060 PASS)
- [X] T067 [US1] Implement `llm:getResponse` handler to load full response content in llmHandlers (make T061 PASS)
- [X] T068 [US1] Add event emitters for `llm:response:complete`, `llm:queue:updated` in llmHandlers
- [X] T069 [US1] Register all LLM handlers in main.ts

### 3.5 Preload Script

- [X] T070 [US1] Add LLM IPC API to context bridge in `src/preload/preload.ts` (already supports generic IPC)

### 3.6 Settings UI Tests

- [ ] T071 [P] [US1] Write component tests for LLMSettings Ollama configuration in `tests/unit/renderer/components/settings/LLMSettings.test.tsx`
- [ ] T072 [P] [US1] Write component tests for provider validation in `tests/unit/renderer/components/settings/LLMSettings.test.tsx`

### 3.7 Settings UI Implementation

- [X] T073 [US1] Add LLM settings tab to SettingsModal in `src/renderer/components/settings/SettingsModal.tsx`
- [X] T074 [US1] Create LLMSettings component skeleton in `src/renderer/components/settings/LLMSettings.tsx` (tests should FAIL)
- [X] T075 [US1] Add Ollama base URL input field with default value (http://localhost:11434) in LLMSettings (make T071 PASS)
- [X] T076 [US1] Add Ollama model name text input field with default value (gemma3) in LLMSettings (make T071 PASS)
- [X] T077 [US1] Add timeout configuration input (default: 120 seconds) in LLMSettings (make T071 PASS)
- [X] T078 [US1] Add provider validation button (test connection) in LLMSettings (make T072 PASS)
- [X] T079 [US1] Integrate LLMSettings with useLLMStore for save/load operations

### 3.8 Call LLM Button Tests

- [ ] T080 [P] [US1] Write component tests for "Call LLM" button in ParameterInputModal in `tests/integration/components/ParameterInputModal.test.tsx`
- [ ] T081 [P] [US1] Write component tests for validation checks before LLM call in `tests/integration/components/ParameterInputModal.test.tsx`

### 3.9 Call LLM Button Implementation

- [X] T082 [US1] Add "Call LLM" button to ParameterInputModal in `src/renderer/components/prompt/ParameterInputModal.tsx` (tests should FAIL)
- [X] T083 [US1] Add loading indicator with elapsed time counter to ParameterInputModal (make T080 PASS)
- [X] T084 [US1] Implement button onClick handler to call LLM API via IPC (make T080 PASS)
- [X] T085 [US1] Add validation check (Ollama configured and accessible) before allowing call (make T081 PASS)
- [X] T086 [US1] Add helpful error message if Ollama not configured/running (make T081 PASS)

### 3.10 Side Panel Tests

- [ ] T087 [P] [US1] Write component tests for LLMResponsePanel rendering and animations in `tests/unit/renderer/components/llm/LLMResponsePanel.test.tsx`
- [ ] T088 [P] [US1] Write component tests for response list display in LLMResponsePanel in `tests/unit/renderer/components/llm/LLMResponsePanel.test.tsx`
- [ ] T089 [P] [US1] Write component tests for response expansion view in `tests/unit/renderer/components/llm/LLMResponsePanel.test.tsx`

### 3.11 Side Panel Implementation

- [X] T090 [US1] Create LLMResponsePanel component (modal-style) in `src/renderer/components/llm/LLMResponsePanel.tsx`
- [X] T091 [US1] Implement modal display with history list for LLMResponsePanel (make T087 PASS)
- [X] T092 [US1] Add result list view showing: timestamp, model, status, tokens, delete button (make T088 PASS)
- [X] T093 [US1] Add "View Responses" button in ParameterInputModal (make T088 PASS)
- [X] T094 [US1] Implement response detail view (split panel: list + content) (make T089 PASS)
- [X] T095 [US1] Add copy and delete functionality for responses (make T089 PASS)
- [X] T096 [US1] Integrate LLMResponsePanel with ParameterInputModal (modal triggered by button)

### 3.12 Queue and Badge Indicator Tests

- [ ] T097 [P] [US1] Write component tests for LLMQueueIndicator in `tests/unit/renderer/components/llm/LLMQueueIndicator.test.tsx`
- [ ] T098 [P] [US1] Write component tests for LLMBadge on prompt items in `tests/unit/renderer/components/llm/LLMBadge.test.tsx`
- [ ] T099 [P] [US1] Write integration tests for badge clearing when modal opens in `tests/integration/components/LLMBadge.test.tsx`

### 3.13 Queue and Badge Indicator Implementation

- [X] T100 [US1] Create LLMQueueIndicator component in `src/renderer/components/llm/LLMQueueIndicator.tsx` (tests should FAIL)
- [X] T101 [US1] Add "Cancel All" button to LLMQueueIndicator (make T097 PASS)
- [X] T102 [US1] Place LLMQueueIndicator in TitleBar in `src/renderer/components/layout/TitleBar.tsx`
- [X] T103 [US1] Create LLMBadge component in `src/renderer/components/llm/LLMBadge.tsx` (tests should FAIL)
- [X] T104 [US1] Add LLMBadge to prompt list items in MainContent in `src/renderer/components/layout/MainContent.tsx` (make T098 PASS)
- [X] T105 [US1] Implement badge clearing logic when modal opens in useLLMStore - implemented via clearNewResults (make T099 PASS)

### 3.14 Error Handling Tests

- [ ] T106 [P] [US1] Write unit tests for llmErrorHandler utility in `tests/unit/renderer/utils/llmErrorHandler.test.ts`

### 3.15 Error Handling Implementation

- [X] T107 [US1] Create error message mapping for Ollama-specific errors - handled in OllamaProvider and llmHandlers (make T106 PASS)
- [X] T108 [US1] Add toast notifications for LLM operation status using ToastContainer
- [X] T109 [US1] Add troubleshooting guidance for common Ollama errors - error messages in i18n

### 3.16 End-to-End Integration Test

- [ ] T110 [US1] Write end-to-end test for complete Ollama workflow (configure → call → display response) in `tests/integration/components/OllamaWorkflow.test.tsx`

**Checkpoint**: At this point, User Story 1 (Ollama MVP) should be fully functional and testable independently

---

## Phase 4: User Story 2 - Parameter Input and Substitution (Priority: P2)

**Goal**: Users can input values for prompt parameters before calling the LLM, ensuring the final prompt sent to the API has all required values substituted correctly

**Independent Test**: User can open parameter input modal, fill in all required parameters, and see them properly substituted in the preview before calling LLM

### 4.1 Parameter Detection Tests

- [ ] T111 [P] [US2] Write unit tests for parameter detection from prompt text in `tests/unit/renderer/utils/parameterParser.test.ts`
- [ ] T112 [P] [US2] Write unit tests for required/optional parameter distinction in `tests/unit/renderer/utils/parameterParser.test.ts`

### 4.2 Enhanced Parameter Input Tests

- [ ] T113 [P] [US2] Write component tests for parameter validation highlighting in `tests/unit/renderer/components/parameter/ParameterInputModal.test.tsx`
- [ ] T114 [P] [US2] Write component tests for required parameter enforcement in `tests/unit/renderer/components/parameter/ParameterInputModal.test.tsx`

### 4.3 Parameter Substitution Tests

- [ ] T115 [P] [US2] Write unit tests for {{parameter}} syntax substitution in `tests/unit/renderer/utils/parameterSubstitution.test.ts`
- [ ] T116 [P] [US2] Write unit tests for default value handling in `tests/unit/renderer/utils/parameterSubstitution.test.ts`

### 4.4 Enhanced Parameter Input Implementation

- [ ] T117 [US2] Enhance ParameterInputModal to detect all parameters from prompt in `src/renderer/components/parameter/ParameterInputModal.tsx` (make T111, T112 PASS)
- [ ] T118 [US2] Add required/optional parameter distinction in parameter input UI (make T113 PASS)
- [ ] T119 [US2] Add validation highlighting for missing required parameters (make T113 PASS)
- [ ] T120 [US2] Prevent LLM call button from being clickable if required parameters missing (make T114 PASS)

### 4.5 Parameter Substitution Implementation

- [ ] T121 [US2] Enhance parameterSubstitution utility to support {{parameter}} syntax (make T115 PASS)
- [ ] T122 [US2] Add default value handling for optional parameters (make T116 PASS)
- [ ] T123 [US2] Add parameter preview before LLM call in ParameterInputModal

### 4.6 Integration with Ollama

- [ ] T124 [US2] Update `llm:call` handler to use substituted prompt content
- [ ] T125 [US2] Store parameter values in LLM response metadata for history display

### 4.7 End-to-End Integration Test

- [ ] T126 [US2] Write end-to-end test for parameter substitution workflow in `tests/integration/components/ParameterWorkflow.test.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Cloud LLM Provider Support (Priority: P2)

**Goal**: Users can add cloud LLM providers (OpenAI, Azure OpenAI, Gemini) in addition to the default Ollama support

**Independent Test**: User can add API credentials for OpenAI, select it as active provider, and successfully call OpenAI's API

### 5.1 OpenAI Provider Tests

- [ ] T127 [P] [US3] Write unit tests for OpenAIProvider validate() in `tests/unit/services/providers/OpenAIProvider.test.ts`
- [ ] T128 [P] [US3] Write unit tests for OpenAIProvider generate() in `tests/unit/services/providers/OpenAIProvider.test.ts`
- [ ] T129 [P] [US3] Write unit tests for token usage extraction in `tests/unit/services/providers/OpenAIProvider.test.ts`
- [ ] T129.5 [P] [US3] Write integration test for token usage accuracy validation (within 5% of provider-reported) in `tests/integration/services/tokenUsageAccuracy.test.ts`
- [ ] T130 [P] [US3] Write unit tests for cost estimation in `tests/unit/services/providers/OpenAIProvider.test.ts`
- [ ] T131 [P] [US3] Write unit tests for OpenAI error handling (401, 429) in `tests/unit/services/providers/OpenAIProvider.test.ts`

### 5.2 OpenAI Provider Implementation

- [ ] T132 [US3] Create OpenAIProvider class skeleton in `src/main/services/providers/OpenAIProvider.ts` (tests should FAIL)
- [ ] T133 [US3] Implement validate() method for OpenAI credential check in OpenAIProvider (make T127 PASS)
- [ ] T134 [US3] Implement generate() method using OpenAI SDK in OpenAIProvider (make T128 PASS)
- [ ] T135 [US3] Implement token usage extraction from OpenAI response (make T129 PASS)
- [ ] T136 [US3] Implement cost estimation for OpenAI models (make T130 PASS)
- [ ] T137 [US3] Add error handling for OpenAI-specific errors (make T131 PASS)

### 5.3 Azure OpenAI Provider Tests

- [ ] T138 [P] [US3] Write unit tests for AzureOpenAIProvider validate() in `tests/unit/services/providers/AzureOpenAIProvider.test.ts`
- [ ] T139 [P] [US3] Write unit tests for AzureOpenAIProvider generate() in `tests/unit/services/providers/AzureOpenAIProvider.test.ts`
- [ ] T140 [P] [US3] Write unit tests for Azure-specific endpoint handling in `tests/unit/services/providers/AzureOpenAIProvider.test.ts`

### 5.4 Azure OpenAI Provider Implementation

- [ ] T141 [US3] Create AzureOpenAIProvider class skeleton in `src/main/services/providers/AzureOpenAIProvider.ts` (tests should FAIL)
- [ ] T142 [US3] Implement validate() method for Azure endpoint check (make T138 PASS)
- [ ] T143 [US3] Implement generate() method using OpenAI SDK with Azure configuration (make T139 PASS)
- [ ] T144 [US3] Add Azure-specific endpoint URL and api-version handling (make T140 PASS)

### 5.5 Gemini Provider Tests

- [ ] T145 [P] [US3] Write unit tests for GeminiProvider validate() in `tests/unit/services/providers/GeminiProvider.test.ts`
- [ ] T146 [P] [US3] Write unit tests for GeminiProvider generate() in `tests/unit/services/providers/GeminiProvider.test.ts`
- [ ] T147 [P] [US3] Write unit tests for Gemini safety settings in `tests/unit/services/providers/GeminiProvider.test.ts`
- [ ] T148 [P] [US3] Write unit tests for Gemini error handling in `tests/unit/services/providers/GeminiProvider.test.ts`

### 5.6 Gemini Provider Implementation

- [ ] T149 [US3] Create GeminiProvider class skeleton in `src/main/services/providers/GeminiProvider.ts` (tests should FAIL)
- [ ] T150 [US3] Implement validate() method for Gemini API key check (make T145 PASS)
- [ ] T151 [US3] Implement generate() method using Google Generative AI SDK (make T146 PASS)
- [ ] T152 [US3] Implement safety settings handling for Gemini (make T147 PASS)
- [ ] T153 [US3] Add error handling for Gemini-specific errors (make T148 PASS)

### 5.7 Provider Management UI Tests

- [ ] T154 [P] [US3] Write component tests for provider type selector in `tests/unit/renderer/components/settings/LLMSettings.test.tsx`
- [ ] T155 [P] [US3] Write component tests for API key input with mask/unmask in `tests/unit/renderer/components/settings/LLMSettings.test.tsx`
- [ ] T156 [P] [US3] Write component tests for provider switching in `tests/unit/renderer/components/settings/LLMSettings.test.tsx`

### 5.8 Provider Management UI Implementation

- [ ] T157 [US3] Add provider type selector to LLMSettings (make T154 PASS)
- [ ] T158 [US3] Add API key input field with mask/unmask toggle (make T155 PASS)
- [ ] T159 [US3] Add Azure-specific fields (endpoint URL, deployment ID) in LLMSettings
- [ ] T160 [US3] Add provider list view showing all configured providers in LLMSettings
- [ ] T161 [US3] Add active provider indicator and switch button (make T156 PASS)
- [ ] T162 [US3] Implement secure credential saving (encrypted via safeStorage) in LLMSettings

### 5.9 Provider Integration

- [ ] T163 [US3] Update LLMService to support multiple provider types (factory pattern)
- [ ] T164 [US3] Add provider-specific timeout configuration to LLMService
- [ ] T165 [US3] Update response metadata to store provider type in SQLite

### 5.10 End-to-End Integration Tests

- [ ] T166 [P] [US3] Write end-to-end test for OpenAI workflow in `tests/integration/components/OpenAIWorkflow.test.tsx`
- [ ] T167 [P] [US3] Write end-to-end test for Azure workflow in `tests/integration/components/AzureWorkflow.test.tsx`
- [ ] T168 [P] [US3] Write end-to-end test for Gemini workflow in `tests/integration/components/GeminiWorkflow.test.tsx`

**Checkpoint**: All MVP user stories (US1, US2, US3) should now be independently functional

---

## Phase 6: User Story 4 - Advanced Model Selection and Management (Priority: P3)

**Goal**: Users can select models from a dropdown list (auto-detected from provider), mark favorites, and switch models dynamically

**Independent Test**: User can view dropdown of auto-detected Ollama models, select one, mark favorites, and switch between them without going to settings

### 6.1 Model Detection Tests

- [ ] T169 [P] [US4] Write unit tests for model list caching in `tests/unit/services/LLMService.test.ts`
- [ ] T170 [P] [US4] Write unit tests for periodic model refresh in `tests/unit/services/LLMService.test.ts`
- [ ] T171 [P] [US4] Write integration tests for `llm:models:list` IPC handler in `tests/integration/ipc/llmHandlers.test.ts`

### 6.2 Model Detection Implementation

- [ ] T172 [US4] Implement model list caching in LLMService (make T169 PASS)
- [ ] T173 [US4] Add periodic model list refresh (every 5 minutes) in LLMService (make T170 PASS)
- [ ] T174 [US4] Implement `llm:models:list` IPC handler in llmHandlers (make T171 PASS)

### 6.3 Model Selection UI Tests

- [ ] T175 [P] [US4] Write component tests for ModelSelector dropdown in `tests/unit/renderer/components/llm/ModelSelector.test.tsx`
- [ ] T176 [P] [US4] Write component tests for model favorite marking in `tests/unit/renderer/components/llm/ModelSelector.test.tsx`
- [ ] T177 [P] [US4] Write component tests for favorite sorting in `tests/unit/renderer/components/llm/ModelSelector.test.tsx`

### 6.4 Model Selection UI Implementation

- [ ] T178 [US4] Create ModelSelector dropdown component in `src/renderer/components/llm/ModelSelector.tsx` (tests should FAIL)
- [ ] T179 [US4] Add ModelSelector to ParameterInputModal header (make T175 PASS)
- [ ] T180 [US4] Implement model favorite marking (star icon) (make T176 PASS)
- [ ] T181 [US4] Sort favorites to top of model list (make T177 PASS)
- [ ] T182 [US4] Add model metadata display (context window, cost) in dropdown

### 6.5 Model Management

- [ ] T183 [US4] Add favorite models persistence in useLLMStore
- [ ] T184 [US4] Update `llm:call` handler to use selected model from dropdown
- [ ] T185 [US4] Add model switching without settings navigation

### 6.6 End-to-End Integration Test

- [ ] T186 [US4] Write end-to-end test for model selection workflow in `tests/integration/components/ModelSelectionWorkflow.test.tsx`

**Checkpoint**: User Story 4 complete - advanced model features available

---

## Phase 7: User Story 5 - Response Management (Priority: P3)

**Goal**: Users can interact with LLM responses effectively by copying response text, viewing response history, and regenerating responses

**Independent Test**: User can receive LLM response, click copy button to copy text, view history of past responses, and regenerate without re-entering parameters

### 7.1 Copy Functionality Tests

- [ ] T187 [P] [US5] Write component tests for copy button functionality in `tests/unit/renderer/components/llm/LLMSidePanel.test.tsx`
- [ ] T188 [P] [US5] Write integration tests for clipboard operations in `tests/integration/components/CopyWorkflow.test.tsx`

### 7.2 Copy Functionality Implementation

- [ ] T189 [US5] Enhance copy button in LLMSidePanel result items (make T187 PASS)
- [ ] T190 [US5] Add copy button to expanded response view (make T187 PASS)
- [ ] T191 [US5] Add clipboard success toast notification (make T188 PASS)

### 7.3 Response History UI Tests

- [ ] T192 [P] [US5] Write component tests for pagination in `tests/unit/renderer/components/llm/LLMSidePanel.test.tsx`
- [ ] T193 [P] [US5] Write component tests for response sorting in `tests/unit/renderer/components/llm/LLMSidePanel.test.tsx`
- [ ] T194 [P] [US5] Write component tests for response filtering in `tests/unit/renderer/components/llm/LLMSidePanel.test.tsx`

### 7.4 Response History UI Implementation

- [ ] T195 [US5] Add pagination controls to LLMSidePanel (make T192 PASS)
- [ ] T196 [US5] Add response sorting options (newest/oldest first) (make T193 PASS)
- [ ] T197 [US5] Add response filtering by provider/status (make T194 PASS)

### 7.5 Response Deletion Tests

- [ ] T198 [P] [US5] Write integration tests for individual response deletion in `tests/integration/ipc/llmHandlers.test.ts`
- [ ] T199 [P] [US5] Write integration tests for clear all responses in `tests/integration/ipc/llmHandlers.test.ts`
- [ ] T200 [P] [US5] Write component tests for delete confirmation dialog in `tests/unit/renderer/components/llm/LLMSidePanel.test.tsx`

### 7.6 Response Deletion Implementation

- [ ] T201 [US5] Add individual delete button to each response in LLMSidePanel (make T200 PASS)
- [ ] T202 [US5] Add confirmation dialog for delete operation (make T200 PASS)
- [ ] T203 [US5] Add "Clear All Results" button to LLMSidePanel header (make T200 PASS)
- [ ] T204 [US5] Implement `llm:deleteResponse` IPC handler (make T198 PASS)
- [ ] T205 [US5] Implement `llm:deleteAllResponses` IPC handler (make T199 PASS)
- [ ] T206 [US5] Close expanded view if displayed response is deleted

### 7.7 Regenerate Functionality Tests

- [ ] T207 [P] [US5] Write component tests for regenerate button in `tests/unit/renderer/components/llm/LLMSidePanel.test.tsx`
- [ ] T208 [P] [US5] Write integration tests for parameter preservation in `tests/integration/components/RegenerateWorkflow.test.tsx`

### 7.8 Regenerate Functionality Implementation

- [ ] T209 [US5] Add "Regenerate" button to response items (make T207 PASS)
- [ ] T210 [US5] Preserve parameter values when regenerating (make T208 PASS)
- [ ] T211 [US5] Allow provider/model change before regenerating (make T208 PASS)

### 7.9 End-to-End Integration Test

- [ ] T212 [US5] Write end-to-end test for response management workflow in `tests/integration/components/ResponseManagementWorkflow.test.tsx`

**Checkpoint**: All user stories complete - full feature set available

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### 8.1 Token Usage and Cost Display Tests

- [ ] T213 [P] Write unit tests for token usage extraction in `tests/unit/main/utils/tokenCalculator.test.ts`
- [ ] T214 [P] Write unit tests for cost calculation in `tests/unit/main/utils/tokenCalculator.test.ts`
- [ ] T215 [P] Write component tests for TokenUsageDisplay in `tests/unit/renderer/components/llm/TokenUsageDisplay.test.tsx`

### 8.2 Token Usage and Cost Display Implementation

- [ ] T216 [P] Implement token usage extraction for all providers (make T213 PASS)
- [ ] T217 [P] Add cost calculation for each provider (make T214 PASS)
- [ ] T218 Create TokenUsageDisplay component in `src/renderer/components/llm/TokenUsageDisplay.tsx` (make T215 PASS)
- [ ] T219 Add TokenUsageDisplay to response items in LLMSidePanel
- [ ] T220 Add cumulative token usage display to LLMSidePanel footer

### 8.3 Performance Optimization

- [ ] T221 [P] Implement LRU cache for recently viewed responses in useLLMStore
- [ ] T222 [P] Add lazy loading for response content in LLMSidePanel
- [ ] T223 [P] Optimize SQLite queries with proper indexing
- [ ] T224 Implement background cleanup scheduler in main.ts

### 8.4 User Experience

- [ ] T225 [P] Add keyboard shortcuts for LLM operations using useKeyboardShortcuts
- [ ] T226 [P] Add accessibility attributes (ARIA labels) to all LLM components
- [ ] T227 [P] Add animation transitions for side panel and modal state changes
- [ ] T228 Add empty state illustrations for no responses in LLMSidePanel

### 8.5 Error Recovery Tests

- [ ] T229 [P] Write unit tests for retry logic with exponential backoff in `tests/unit/services/LLMService.test.ts`
- [ ] T230 [P] Write unit tests for network status detection in `tests/unit/services/LLMService.test.ts`
- [ ] T231 [P] Write unit tests for credential refresh flow in `tests/unit/services/CredentialService.test.ts`

### 8.6 Error Recovery Implementation

- [ ] T232 Implement retry logic with exponential backoff in LLMService (make T229 PASS)
- [ ] T233 Add network status detection before API call in LLMService (make T230 PASS)
- [ ] T234 Add credential refresh flow for expired tokens in CredentialService (make T231 PASS)

### 8.7 Documentation

- [ ] T235 [P] Update README.md with LLM integration setup instructions
- [ ] T236 [P] Add inline code comments for complex logic
- [ ] T237 [P] Document IPC channel contracts in code (JSDoc)

### 8.8 Manual File Deletion Handling Tests

- [ ] T238 [P] Write integration tests for manual .md file deletion in `tests/integration/filesystem/manualDeletion.test.ts`
- [ ] T239 [P] Write integration tests for real-time file existence check in `tests/integration/filesystem/fileExistence.test.ts`

### 8.9 Manual File Deletion Handling Implementation

- [ ] T240 Add real-time file existence check before rendering response (make T239 PASS)
- [ ] T241 Filter out entries with missing .md files in `llm:getHistory` handler (make T238 PASS)
- [ ] T242 Test manual file deletion scenario and verify graceful handling

### 8.10 Validation

- [ ] T243 Run quickstart.md validation checklist manually
- [ ] T244 Verify all edge cases from spec.md are handled
- [ ] T245 Test app quit scenarios (graceful and kill) to verify cleanup
- [ ] T245.5 [P] Write performance test for concurrent API calls (10+ simultaneous requests) to validate SC-004 in `tests/integration/performance/concurrentCalls.test.ts`
- [ ] T246 Run full test suite and ensure 100% pass rate
- [ ] T247 Run type check (pnpm run tsc) and ensure no errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
  - **TDD Pattern**: Write tests → Watch fail → Implement → Watch pass
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P2): Can start after Foundational - Builds on US1 but independently testable
  - User Story 3 (P2): Can start after Foundational - Independently testable
  - User Story 4 (P3): Depends on US1 and US3 (needs providers and basic call working)
  - User Story 5 (P3): Depends on US1 (needs basic response display)
- **Polish (Phase 8)**: Depends on desired user stories being complete

### TDD Workflow (Within Each Phase)

1. **Write test** → Test FAILS (expected)
2. **Implement code** → Test PASSES
3. **Refactor** → Test still PASSES
4. **Commit** → Move to next task

### Within Each User Story

- **Tests before implementation** (TDD principle)
- Unit tests → Integration tests → Implementation → E2E tests
- Main process components before renderer components
- IPC handlers before UI components that call them
- Settings UI before operational UI

### Parallel Opportunities

**Setup Phase (Phase 1)**: T002, T003, T004, T007 can run in parallel

**Foundational Phase (Phase 2)**:
- Test groups: T009-T013, T020-T021, T025-T027, T033-T036 can run in parallel
- Implementation follows tests sequentially

**User Story 1 (Phase 3)**:
- Test groups: T048-T051, T057-T061, T071-T072, T080-T081, T087-T089, T097-T099 can run in parallel
- Implementation follows tests

**User Story 3 (Phase 5)**:
- Provider test groups can run in parallel: T127-T131 (OpenAI), T138-T140 (Azure), T145-T148 (Gemini)
- Provider implementations follow tests
- E2E tests: T166-T168 can run in parallel

**Polish Phase (Phase 8)**:
- Test groups can run in parallel
- Documentation tasks can run in parallel

---

## TDD Example: Foundational Phase (Storage Layer)

```bash
# Step 1: Write tests (all should FAIL)
Task T009: Write unit tests for provider CRUD
Task T010: Write unit tests for response metadata CRUD
Task T011: Write unit tests for file operations
Task T012: Write unit tests for orphaned entry cleanup
Task T013: Write unit tests for per-prompt limit

# Step 2: Run tests → ALL FAIL (expected, no implementation yet)
pnpm test tests/unit/services/LLMStorageService.test.ts

# Step 3: Create skeleton
Task T014: Create LLMStorageService skeleton

# Step 4: Implement one by one, making tests PASS
Task T015: Implement provider CRUD → T009 PASSES
Task T016: Implement response CRUD → T010 PASSES
Task T017: Implement file operations → T011 PASSES
Task T018: Implement cleanup → T012 PASSES
Task T019: Implement limit enforcement → T013 PASSES

# Step 5: All tests GREEN → Move to next component
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - TDD Approach

1. **Phase 1: Setup** (T001-T008) → 8 tasks
2. **Phase 2: Foundational** (T009-T047) → 39 tasks (tests + implementation)
   - Write all tests first
   - Implement to make tests pass
3. **Phase 3: User Story 1** (T048-T110) → 63 tasks (tests + implementation + E2E)
   - Write tests for each subsystem
   - Implement to make tests pass
   - E2E test at the end
4. **STOP and VALIDATE**: All tests should be GREEN
5. Deploy/demo if ready

**Estimated Tasks for MVP**: 110 tasks (Setup + Foundational + US1)

### Incremental Delivery with TDD

1. **Foundation** (T001-T047) → Core infrastructure + tests → All GREEN ✅
2. **MVP** (T048-T110) → Ollama + tests → All GREEN → Deploy ✅
3. **Parameters** (T111-T126) → Enhanced input + tests → All GREEN → Deploy ✅
4. **Cloud** (T127-T168) → Cloud providers + tests → All GREEN → Deploy ✅
5. **Advanced** (T169-T186) → Model selection + tests → All GREEN → Deploy ✅
6. **Management** (T187-T212) → Response mgmt + tests → All GREEN → Deploy ✅
7. **Polish** (T213-T247) → Final refinements + validation → All GREEN → Deploy ✅

Each phase includes tests that must pass before moving forward.

---

## Notes

- **TDD Principle**: RED → GREEN → REFACTOR
- [P] tasks = different files, can run in parallel
- [Story] label maps task to specific user story
- Each test task MUST be written before its implementation task
- Run tests after each implementation task to verify it passes
- Commit when tests are GREEN
- Total tasks: **247 tasks** (155 implementation + 92 test tasks)
- MVP scope: **110 tasks** (Phases 1-3 with tests)

---

## Task Count Summary

| Phase | Task Range | Count | Description |
|-------|------------|-------|-------------|
| Phase 1 | T001-T008 | 8 | Setup |
| Phase 2 | T009-T047 | 39 | Foundational (tests + impl) - **BLOCKS ALL** |
| Phase 3 | T048-T110 | 63 | User Story 1 (tests + impl + E2E) |
| Phase 4 | T111-T126 | 16 | User Story 2 (tests + impl + E2E) |
| Phase 5 | T127-T168 | 42 | User Story 3 (tests + impl + E2E) |
| Phase 6 | T169-T186 | 18 | User Story 4 (tests + impl + E2E) |
| Phase 7 | T187-T212 | 26 | User Story 5 (tests + impl + E2E) |
| Phase 8 | T213-T247.5 | 36 | Polish (tests + impl + validation) |
| **Total** | **T001-T247.5** | **250** | **Full Feature with TDD** |

**MVP Milestone**: 110 tasks (Phases 1-3 with full test coverage)
**Test Tasks**: 95 test tasks across all phases
**Implementation Tasks**: 155 implementation tasks
**Parallel Opportunities**: 60+ tasks marked [P]
