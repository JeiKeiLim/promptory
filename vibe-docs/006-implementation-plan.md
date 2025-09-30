# Promptory 구현 계획서 (Cursor Agent 전용)

## 프로젝트 개요

### 기본 정보
- **프로젝트명**: Promptory - LLM Prompt 관리 데스크탑 애플리케이션
- **구현 기간**: 6-8주 (최종 애플리케이션)
- **기술 스택**: Electron 32+ + React + TypeScript 5.6+ + better-sqlite3
- **개발 환경**: Node.js v24.7.0 LTS + pnpm + macOS
- **빌드 도구**: Vite 6+
- **목표**: 프로덕션 레디 상태의 완성된 애플리케이션

### Agent 실행 원칙
1. **단계별 구현**: Level 1 → Level 2 → Level 3 순서로 진행
2. **완전성 우선**: 각 단계에서 완전히 동작하는 코드 생성
3. **타입 안전성**: 모든 코드는 TypeScript로 작성
4. **테스트 포함**: 핵심 기능에 대한 단위 테스트 자동 생성
5. **문서화**: 생성된 코드에 JSDoc 주석 포함

## 구현 단계별 세부 계획

### Level 1: 기반 구조 구현 (Week 1-2)

#### 1.1 프로젝트 초기화 (1일)
**Agent 실행 명령**: "프로젝트 초기화 및 기본 설정"

**구현 대상**:
- `package.json` 생성 (Electron 32+ + React + TypeScript 5.6+ 의존성)
- `pnpm-workspace.yaml` 설정 (pnpm 워크스페이스)
- `tsconfig.json` 설정 (strict mode 활성화, Node.js v24.7.0 호환)
- `vite.config.ts` 설정 (Vite 6+ + Electron + React 빌드)
- `.eslintrc.js` + `prettier.config.js` 설정
- 기본 디렉토리 구조 생성

**생성할 파일**:
```
promptory/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .eslintrc.js
├── prettier.config.js
├── src/
│   ├── main/
│   ├── renderer/
│   ├── shared/
│   └── preload/
└── tests/
```

**검증 기준**: `pnpm install` 및 `pnpm run dev` 실행 가능

#### 1.2 Electron 기반 구조 (2일)
**Agent 실행 명령**: "Electron 메인 프로세스 및 IPC 기반 구현"

**구현 대상**:
- `src/main/main.ts` - Electron 메인 프로세스
- `src/preload/preload.ts` - Context Isolation 설정
- `src/shared/types/ipc.ts` - IPC 타입 정의
- `src/renderer/App.tsx` - React 앱 기본 구조

**핵심 기능**:
- Context Isolation 활성화
- 기본 IPC 채널 (ping/pong 테스트)
- 개발자 도구 활성화
- Hot Reload 설정

**검증 기준**: Electron 앱 실행 및 React 렌더링 확인

#### 1.3 파일 시스템 서비스 (3일)
**Agent 실행 명령**: "파일 시스템 관리 서비스 완전 구현"

**구현 대상**:
- `src/main/services/FileService.ts` - 파일 CRUD 서비스
- `src/main/utils/yamlParser.ts` - YAML 헤더 파싱
- `src/main/utils/pathValidator.ts` - 경로 검증
- `src/main/handlers/fileHandlers.ts` - IPC 핸들러
- `src/shared/types/prompt.ts` - 프롬프트 타입 정의

**핵심 기능**:
- 프롬프트 파일 생성/읽기/수정/삭제
- YAML 헤더 파싱 및 검증
- 파일명 생성 규칙 (특수문자 → 하이픈)
- 디렉토리 순회 공격 방지

**테스트 요구사항**:
- `tests/unit/services/FileService.test.ts`
- YAML 파싱 정확성 테스트
- 파일 CRUD 작업 테스트

**검증 기준**: 프롬프트 파일 생성/읽기/수정/삭제 모든 작업 성공

#### 1.4 better-sqlite3 캐시 시스템 (2일)
**Agent 실행 명령**: "better-sqlite3 기반 검색 인덱스 캐시 시스템 구현"

**구현 대상**:
- `src/main/services/CacheService.ts` - better-sqlite3 캐시 관리
- `src/main/database/schema.sql` - better-sqlite3 최적화 스키마
- `src/main/database/migrations.ts` - 스키마 마이그레이션
- `src/main/handlers/cacheHandlers.ts` - 캐시 IPC 핸들러

**핵심 기능**:
- 검색 인덱스 테이블 생성/관리
- 파일 변경 시 실시간 인덱스 업데이트
- 태그 캐시 관리
- 설정 캐시 관리

**검증 기준**: 파일 생성 시 자동 인덱스 생성 확인

### Level 2: UI 구조 구현 (Week 3-4)

#### 2.1 React 기반 구조 (2일)
**Agent 실행 명령**: "React 컴포넌트 아키텍처 및 상태 관리 구현"

**구현 대상**:
- `src/renderer/stores/useAppStore.ts` - Zustand 앱 상태
- `src/renderer/stores/usePromptStore.ts` - 프롬프트 상태
- `src/renderer/components/layout/Layout.tsx` - 메인 레이아웃
- `src/renderer/hooks/useIPC.ts` - IPC 통신 훅
- `src/renderer/utils/api.ts` - API 클라이언트

**핵심 기능**:
- 3패널 레이아웃 (좌측/중앙/우측)
- 패널 리사이저 구현
- Zustand 상태 관리 설정
- IPC 통신 타입 안전 래퍼

**검증 기준**: 3패널 레이아웃 렌더링 및 리사이저 동작 확인

#### 2.2 사이드바 구현 (3일)
**Agent 실행 명령**: "좌측 사이드바 완전 구현 (즐겨찾기/폴더/태그)"

**구현 대상**:
- `src/renderer/components/sidebar/Sidebar.tsx` - 메인 사이드바
- `src/renderer/components/sidebar/FavoritesSection.tsx` - 즐겨찾기
- `src/renderer/components/sidebar/FolderTreeSection.tsx` - 폴더 트리
- `src/renderer/components/sidebar/TagsSection.tsx` - 태그 목록
- `src/renderer/components/common/CollapsibleSection.tsx` - 접기/펴기

**핵심 기능**:
- 섹션별 접기/펴기 (collapsible)
- 폴더 트리 네비게이션
- 태그 필터링
- 즐겨찾기 목록 표시

**검증 기준**: 모든 섹션 접기/펴기 및 네비게이션 동작 확인

#### 2.3 프롬프트 카드 시스템 (3일)
**Agent 실행 명령**: "프롬프트 카드 및 그리드 레이아웃 완전 구현"

**구현 대상**:
- `src/renderer/components/prompt/PromptCard.tsx` - 프롬프트 카드
- `src/renderer/components/prompt/PromptCardGrid.tsx` - 카드 그리드
- `src/renderer/components/prompt/PromptContextMenu.tsx` - 컨텍스트 메뉴
- `src/renderer/components/common/VirtualizedGrid.tsx` - 가상화 그리드

**핵심 기능**:
- 프롬프트 메타데이터 표시 (제목/설명/태그)
- 즐겨찾기 아이콘 표시
- 우클릭 컨텍스트 메뉴
- 가상화를 통한 성능 최적화

**검증 기준**: 프롬프트 카드 렌더링 및 컨텍스트 메뉴 동작 확인

### Level 3: 편집 및 검색 시스템 (Week 5-6)

#### 3.1 프롬프트 편집 시스템 (4일)
**Agent 실행 명령**: "Monaco Editor 기반 프롬프트 편집 시스템 완전 구현"

**구현 대상**:
- `src/renderer/components/prompt/PromptDetail.tsx` - 우측 패널
- `src/renderer/components/prompt/PromptEditor.tsx` - Monaco Editor
- `src/renderer/components/prompt/MetadataForm.tsx` - YAML 폼
- `src/renderer/components/prompt/MarkdownRenderer.tsx` - 미리보기
- `src/renderer/hooks/useMonacoEditor.ts` - Monaco Editor 훅

**핵심 기능**:
- 읽기/편집 모드 전환
- Monaco Editor + 마크다운 문법 하이라이팅
- 실시간 미리보기 (marked 라이브러리)
- YAML 메타데이터 폼 편집
- 변경사항 감지 및 확인 다이얼로그

**검증 기준**: 프롬프트 편집 및 실시간 미리보기 동작 확인

#### 3.2 검색 시스템 (2일)
**Agent 실행 명령**: "Fuse.js 기반 실시간 검색 시스템 완전 구현"

**구현 대상**:
- `src/main/services/SearchService.ts` - Fuse.js 검색 서비스
- `src/renderer/components/search/SearchBar.tsx` - 검색바
- `src/renderer/components/search/SearchResults.tsx` - 검색 결과
- `src/renderer/hooks/useSearchDebounce.ts` - 검색 디바운싱

**핵심 기능**:
- 실시간 검색 (300ms 디바운싱)
- 검색 스코프 설정 (제목/태그/내용)
- 검색 결과 하이라이트
- 검색 성능 최적화

**검증 기준**: 실시간 검색 및 결과 표시 확인

### Level 4: 고급 기능 구현 (Week 7-8)

#### 4.1 파라미터 시스템 (3일)
**Agent 실행 명령**: "파라미터 자동 감지 및 입력 모달 완전 구현"

**구현 대상**:
- `src/main/services/ParameterService.ts` - 파라미터 처리 서비스
- `src/renderer/components/parameter/ParameterInputModal.tsx` - 입력 모달
- `src/renderer/components/parameter/ParameterForm.tsx` - 파라미터 폼
- `src/renderer/hooks/useParameterDetection.ts` - 파라미터 감지 훅

**핵심 기능**:
- `{파라미터명}` 자동 감지
- 파라미터 타입 처리 (string/category)
- 동적 파라미터 입력 폼
- 실시간 미리보기 (좌우 분할)
- 클립보드 복사 기능

**검증 기준**: 파라미터 감지 및 입력 모달 동작 확인

#### 4.2 파일 감시 및 최적화 (2일)
**Agent 실행 명령**: "파일 감시 및 성능 최적화 완전 구현"

**구현 대상**:
- `src/main/services/FileWatcherService.ts` - chokidar 파일 감시
- `src/renderer/hooks/useVirtualization.ts` - UI 가상화
- `src/renderer/utils/performance.ts` - 성능 최적화 유틸

**핵심 기능**:
- 외부 파일 변경 감지
- 실시간 UI 업데이트
- 대용량 목록 가상화
- 메모리 사용량 최적화

**검증 기준**: 외부 파일 변경 시 자동 새로고침 확인

#### 4.3 키보드 단축키 및 UX (1일)
**Agent 실행 명령**: "키보드 단축키 및 사용자 경험 개선 구현"

**구현 대상**:
- `src/renderer/hooks/useKeyboardShortcuts.ts` - 단축키 훅
- `src/renderer/components/common/ToastContainer.tsx` - 토스트 알림
- `src/renderer/components/common/ConfirmDialog.tsx` - 확인 다이얼로그

**핵심 기능**:
- 주요 단축키 (Cmd+N, Cmd+F, Cmd+S, Cmd+D)
- 토스트 알림 시스템
- 확인 다이얼로그 (3개 옵션)

**검증 기준**: 모든 단축키 동작 및 알림 표시 확인

#### 4.4 테스트 및 패키징 (2일)
**Agent 실행 명령**: "단위 테스트 완성 및 Electron 빌드 설정"

**구현 대상**:
- `tests/unit/` - 핵심 서비스 단위 테스트
- `tests/integration/` - IPC 통신 통합 테스트
- `electron-builder.config.js` - 빌드 설정
- `resources/samples/` - 샘플 프롬프트 5개

**테스트 커버리지 목표**: 80%
**주요 테스트 대상**:
- FileService (파일 CRUD)
- SearchService (검색 기능)
- ParameterService (파라미터 처리)
- 핵심 React 컴포넌트

**검증 기준**: 테스트 통과 및 macOS 앱 빌드 성공

## Agent 실행 가이드

### 단계별 실행 명령어

#### Level 1 실행
```
"Level 1에서 완전 구현 생성 - Promptory 프로젝트 기반 구조"
```

#### Level 2 실행  
```
"Level 2에서 완전 구현 생성 - Promptory UI 구조 및 컴포넌트"
```

#### Level 3 실행
```
"Level 3에서 완전 구현 생성 - Promptory 편집 및 검색 시스템"
```

#### Level 4 실행
```
"Level 4에서 완전 구현 생성 - Promptory 고급 기능 및 최종화"
```

### 실행 시 필수 준수사항

1. **타입 안전성**: 모든 함수와 컴포넌트에 TypeScript 타입 정의
2. **에러 처리**: try-catch 블록 및 사용자 친화적 에러 메시지
3. **JSDoc 주석**: 모든 public 함수에 JSDoc 주석 포함
4. **일관성**: 기존 코드 스타일과 아키텍처 패턴 유지
5. **테스트**: 핵심 비즈니스 로직에 대한 단위 테스트 포함

### 검증 체크리스트

각 Level 완료 후 다음 사항을 확인:

#### Level 1 완료 체크리스트
- [ ] `npm run dev` 실행 시 Electron 앱 정상 실행
- [ ] IPC 통신 (ping/pong) 정상 동작
- [ ] 프롬프트 파일 생성/읽기/수정/삭제 모든 작업 성공
- [ ] SQLite 데이터베이스 생성 및 인덱스 업데이트 확인

#### Level 2 완료 체크리스트
- [ ] 3패널 레이아웃 렌더링 및 리사이저 동작
- [ ] 사이드바 모든 섹션 접기/펴기 동작
- [ ] 프롬프트 카드 표시 및 컨텍스트 메뉴 동작

#### Level 3 완료 체크리스트
- [ ] Monaco Editor 로드 및 마크다운 편집 가능
- [ ] 실시간 미리보기 동작
- [ ] 검색 기능 및 결과 표시 정상 동작

#### Level 4 완료 체크리스트
- [ ] 파라미터 자동 감지 및 입력 모달 동작
- [ ] 외부 파일 변경 시 자동 새로고침
- [ ] 모든 키보드 단축키 동작
- [ ] 테스트 80% 커버리지 달성
- [ ] macOS 앱 빌드 성공

## 기술 스택 세부사항

### 의존성 목록
```json
{
  "dependencies": {
    "electron": "^32.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0",
    "@monaco-editor/react": "^4.6.0",
    "marked": "^12.0.0",
    "fuse.js": "^7.0.0",
    "chokidar": "^3.6.0",
    "js-yaml": "^4.1.0",
    "better-sqlite3": "^9.6.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "electron-builder": "^25.0.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0",
    "@types/node": "^24.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### 파일 구조 템플릿
```
promptory/
├── src/
│   ├── main/                     # Electron 메인 프로세스
│   │   ├── services/            # 비즈니스 로직 서비스
│   │   ├── handlers/            # IPC 핸들러
│   │   ├── utils/               # 유틸리티 함수
│   │   ├── database/            # SQLite 스키마 및 마이그레이션
│   │   └── main.ts              # 메인 프로세스 엔트리
│   ├── renderer/                # React 렌더러 프로세스
│   │   ├── components/          # React 컴포넌트
│   │   ├── stores/              # Zustand 상태 관리
│   │   ├── hooks/               # 커스텀 훅
│   │   ├── utils/               # 렌더러 유틸리티
│   │   └── App.tsx              # React 앱 엔트리
│   ├── shared/                  # 공유 타입 및 상수
│   │   ├── types/               # TypeScript 타입 정의
│   │   └── constants/           # 상수 정의
│   └── preload/                 # Preload 스크립트
│       └── preload.ts           # Context Isolation 설정
├── tests/                       # 테스트 파일
│   ├── unit/                    # 단위 테스트
│   └── integration/             # 통합 테스트
├── resources/                   # 정적 리소스
│   ├── samples/                 # 샘플 프롬프트
│   └── icons/                   # 앱 아이콘
└── build/                       # 빌드 설정
```

## 샘플 프롬프트 명세

생성할 5개 샘플 프롬프트:

### 1. 코드 리뷰 프롬프트
```yaml
---
title: "코드 리뷰 도우미"
description: "코드 리뷰를 위한 체계적인 분석 프롬프트"
tags: ["개발", "코드리뷰", "품질관리"]
favorite: false
created_at: "2024-01-15T09:30:00Z"
parameters:
  - name: "language"
    type: "category"
    required: true
    description: "프로그래밍 언어"
    options: ["Python", "JavaScript", "TypeScript", "Java", "Go"]
  - name: "focus_area"
    type: "string"
    required: false
    description: "집중할 리뷰 영역"
---

# {language} 코드 리뷰 프롬프트

다음 {language} 코드를 리뷰해주세요.

{focus_area}에 특히 집중하여 검토해주세요.

## 검토 항목
- 코드 품질 및 가독성
- 성능 최적화 가능성
- 보안 취약점
- 베스트 프랙티스 준수 여부
```

### 2. 문서 작성 도우미
```yaml
---
title: "문서 작성 도우미"
description: "다양한 형태의 문서 작성을 도와주는 프롬프트"
tags: ["문서작성", "업무", "커뮤니케이션"]
favorite: true
created_at: "2024-01-15T10:00:00Z"
parameters:
  - name: "document_type"
    type: "category"
    required: true
    description: "문서 유형"
    options: ["기획서", "보고서", "매뉴얼", "제안서", "이메일"]
  - name: "tone"
    type: "category"
    required: true
    description: "문서 톤"
    options: ["공식적", "친근한", "전문적", "간결한"]
---

# {document_type} 작성 도우미

{tone} 톤으로 {document_type}를 작성해주세요.

## 작성 가이드라인
- 명확하고 이해하기 쉬운 구조
- 핵심 내용 중심으로 구성
- 적절한 예시 및 근거 제시
- {tone} 어조 유지
```

### 3. 브레인스토밍 프롬프트
```yaml
---
title: "창의적 브레인스토밍"
description: "아이디어 발굴을 위한 창의적 사고 프롬프트"
tags: ["창의성", "아이디어", "브레인스토밍"]
favorite: false
created_at: "2024-01-15T10:30:00Z"
parameters:
  - name: "topic"
    type: "string"
    required: true
    description: "브레인스토밍 주제"
  - name: "perspective"
    type: "category"
    required: false
    description: "접근 관점"
    options: ["사용자 중심", "기술적", "비즈니스", "창의적", "실용적"]
---

# {topic} 브레인스토밍

{topic}에 대해 {perspective} 관점에서 창의적인 아이디어를 제시해주세요.

## 아이디어 발굴 방법
1. 다양한 각도에서 접근
2. 기존 틀에서 벗어난 사고
3. 실현 가능성과 창의성의 균형
4. 구체적인 실행 방안 제시
```

### 4. 언어 번역 도우미
```yaml
---
title: "언어 번역 도우미"
description: "정확하고 자연스러운 번역을 위한 프롬프트"
tags: ["번역", "언어", "커뮤니케이션"]
favorite: true
created_at: "2024-01-15T11:00:00Z"
parameters:
  - name: "source_language"
    type: "category"
    required: true
    description: "원본 언어"
    options: ["한국어", "영어", "일본어", "중국어", "프랑스어"]
  - name: "target_language"
    type: "category"
    required: true
    description: "번역할 언어"
    options: ["한국어", "영어", "일본어", "중국어", "프랑스어"]
---

# {source_language} → {target_language} 번역

다음 {source_language} 텍스트를 {target_language}로 번역해주세요.

## 번역 원칙
- 원문의 의미와 뉘앙스 보존
- 자연스러운 {target_language} 표현 사용
- 문화적 맥락 고려
- 전문 용어의 정확한 번역
```

### 5. 학습 도우미
```yaml
---
title: "학습 도우미"
description: "효과적인 학습을 위한 맞춤형 설명 프롬프트"
tags: ["학습", "교육", "설명"]
favorite: false
created_at: "2024-01-15T11:30:00Z"
parameters:
  - name: "topic"
    type: "string"
    required: true
    description: "학습 주제"
  - name: "level"
    type: "category"
    required: true
    description: "난이도 수준"
    options: ["초급", "중급", "고급"]
---

# {topic} 학습 도우미

{topic}에 대해 {level} 수준에 맞게 설명해주세요.

## 학습 구조
1. 핵심 개념 정의
2. 단계별 설명
3. 실제 예시 제시
4. 연습 문제 또는 활용 방안
5. 추가 학습 자료 추천

{level} 수준에 적합한 용어와 예시를 사용해주세요.
```

이 구현 계획서를 바탕으로 Cursor Agent가 단계적으로 완전한 Promptory 애플리케이션을 개발할 수 있습니다.
