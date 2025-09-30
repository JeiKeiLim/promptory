# Promptory 파일 기반 데이터 구조 설계서

## 시스템 개요

### 데이터 저장 방식의 목적과 역할
Promptory는 전통적인 데이터베이스 대신 **파일 기반 데이터 관리**를 채택하여 다음 목적을 달성합니다:
- **투명성**: 사용자가 직접 파일을 확인하고 편집 가능
- **이식성**: 폴더 복사만으로 완전한 데이터 마이그레이션
- **호환성**: 외부 도구(Git, 텍스트 에디터 등)와 완벽 호환
- **단순성**: 복잡한 DB 설정 없이 즉시 사용 가능

### 전체 아키텍처 개요
```
~/Promptory/                    # 사용자 데이터 루트
├── .promptory/                 # 앱 메타데이터
│   ├── config.yaml            # 앱 설정
│   ├── search-index.json      # 검색 인덱스
│   ├── tags-cache.json        # 태그 자동완성
│   ├── favorites-cache.json   # 즐겨찾기 캐시
│   └── logs/                  # 로그 파일들
├── [사용자 정의 폴더]/         # 프롬프트 분류 폴더
│   ├── prompt1.md
│   └── subfolder/
│       └── prompt2.md
└── sample-prompts/            # 초기 샘플 (선택적)
```

### 기술 선택 사유
- **마크다운 + YAML**: 가독성과 구조화의 균형
- **SQLite 캐시**: better-sqlite3를 통한 고성능 검색 인덱싱
- **파일 시스템 기반**: OS 수준의 파일 감시 및 권한 활용
- **Node.js v24.7.0**: 최신 LTS 버전의 성능 및 보안 향상

## 데이터 모델 정의

### 1. 프롬프트 파일 구조 (.md)

#### 파일 형식
```markdown
---
title: "프롬프트 제목"
description: "프롬프트에 대한 설명 (선택사항)"
tags: ["개발", "코드리뷰", "AI"]
favorite: false
created_at: "2024-01-15T09:30:00Z"
parameters:
  - name: "language"
    type: "category"
    required: true
    description: "프로그래밍 언어"
    options: ["Python", "JavaScript", "Java", "Go"]
  - name: "focus_area"
    type: "string"
    required: false
    description: "집중할 리뷰 영역"
---

# {language} 코드 리뷰 프롬프트

다음 {language} 코드를 리뷰해주세요.

{focus_area}에 특히 집중하여 검토해주세요.

## 검토 항목
- 코드 품질
- 성능 최적화
- 보안 취약점
```

#### YAML 헤더 스키마
| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `title` | string | ✓ | - | 프롬프트 제목 (1-200자) |
| `description` | string | ✗ | "" | 프롬프트 설명 (최대 1000자) |
| `tags` | array<string> | ✗ | [] | 태그 목록 (각 태그 최대 50자) |
| `favorite` | boolean | ✗ | false | 즐겨찾기 여부 |
| `created_at` | datetime | ✓ | 자동생성 | 생성 시간 (ISO 8601) |
| `parameters` | array<Parameter> | ✗ | [] | 파라미터 정의 목록 |

#### Parameter 객체 스키마
| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `name` | string | ✓ | - | 파라미터명 (영문,숫자,언더스코어,한글, 숫자시작불가) |
| `type` | enum | ✓ | "string" | "string" 또는 "category" |
| `required` | boolean | ✗ | true | 필수 입력 여부 |
| `description` | string | ✗ | "" | 파라미터 설명 |
| `options` | array<string> | 조건부 | - | category 타입일 때 필수 |

### 2. 검색 인덱스 구조 (.promptory/search-index.json)

```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-01-15T10:30:00Z",
  "totalFiles": 42,
  "files": [
    {
      "id": "f7a8b9c0-1234-5678-9abc-def012345678",
      "path": "development/code-review.md",
      "title": "코드 리뷰 프롬프트",
      "description": "코드 리뷰를 위한 체계적인 프롬프트",
      "tags": ["개발", "코드리뷰"],
      "content": "다음 코드를 리뷰해주세요 검토 항목 코드 품질...",
      "favorite": true,
      "createdAt": "2024-01-15T09:30:00Z",
      "modifiedAt": "2024-01-15T10:15:00Z",
      "fileSize": 1024,
      "parameterCount": 2
    }
  ]
}
```

#### 인덱스 업데이트 정책
- **트리거**: 파일 생성, 수정, 삭제, 이동 시 즉시 업데이트
- **배치 처리**: 앱 시작 시 전체 스캔으로 동기화 확인
- **오류 처리**: 파싱 실패 파일은 `error` 필드로 상태 표시

### 3. 설정 파일 구조 (.promptory/config.yaml)

```yaml
# Promptory 설정 파일
app:
  version: "1.0.0"
  theme: "system"  # "light" | "dark" | "system"
  fontSize: 14
  language: "ko"   # UI 언어
  
editor:
  wordWrap: true
  showLineNumbers: false
  tabSize: 2
  fontFamily: "Monaco, 'Cascadia Code', monospace"
  
search:
  maxResults: 100
  highlightMatches: true
  searchScope:
    title: true
    tags: true
    content: true
  caseSensitive: false
  
window:
  width: 1200
  height: 800
  rememberSize: true
  
shortcuts:
  newPrompt: "CmdOrCtrl+N"
  search: "CmdOrCtrl+F"
  toggleFavorite: "CmdOrCtrl+D"
  usePrompt: "CmdOrCtrl+U"
  copy: "CmdOrCtrl+C"
  
logs:
  maxFiles: 10
  maxSizePerFile: "10MB"
  level: "INFO"  # "DEBUG" | "INFO" | "WARN" | "ERROR"
```

### 4. 태그 캐시 구조 (.promptory/tags-cache.json)

```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-01-15T10:30:00Z",
  "tags": [
    {
      "name": "개발",
      "count": 15,
      "lastUsed": "2024-01-15T10:15:00Z"
    },
    {
      "name": "코드리뷰",
      "count": 8,
      "lastUsed": "2024-01-15T09:45:00Z"
    }
  ]
}
```

### 5. 즐겨찾기 캐시 구조 (.promptory/favorites-cache.json)

```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-01-15T10:30:00Z",
  "favorites": [
    {
      "id": "f7a8b9c0-1234-5678-9abc-def012345678",
      "path": "development/code-review.md",
      "title": "코드 리뷰 프롬프트"
    }
  ]
}
```

## 데이터 무결성 및 검증

### 1. YAML 헤더 검증 규칙

#### 필수 필드 검증
- `title`: 공백 제거 후 1자 이상 200자 이하
- `created_at`: ISO 8601 형식의 유효한 날짜

#### 데이터 타입 검증
- `tags`: 문자열 배열, 각 태그 50자 이하
- `favorite`: boolean 값
- `parameters`: 배열, 각 요소는 Parameter 스키마 준수

#### 파라미터 검증
- `name`: 정규식 `^[a-zA-Z가-힣][a-zA-Z0-9가-힣_]*$`
- `type`: "string" 또는 "category"만 허용
- `options`: category 타입일 때 1개 이상의 옵션 필요

### 2. 파일 시스템 무결성

#### 파일 ID 생성 전략
```javascript
// 파일 경로와 생성 시간 기반 UUID 생성
function generateFileId(filePath, createdAt) {
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const data = `${filePath}:${createdAt}`;
  return uuidv5(data, namespace);
}
```

#### 파일 이동/이름 변경 처리
1. **파일 감시**: chokidar로 파일 시스템 이벤트 감지
2. **ID 매핑**: 이전 경로 → 새 경로 매핑 테이블 유지
3. **인덱스 업데이트**: 경로 변경 시 ID 유지하며 인덱스 업데이트

## 에러 처리 설계

### 1. 파일 오류 분류

#### YAML 파싱 오류
```json
{
  "type": "YAML_PARSE_ERROR",
  "file": "development/broken-prompt.md",
  "line": 5,
  "message": "Invalid YAML syntax at line 5",
  "suggestion": "Check YAML header formatting"
}
```

#### 파라미터 불일치 오류
```json
{
  "type": "PARAMETER_MISMATCH",
  "file": "development/example.md",
  "issues": [
    {
      "type": "UNUSED_PARAMETER",
      "parameter": "old_param",
      "action": "remove_from_header"
    },
    {
      "type": "MISSING_PARAMETER", 
      "parameter": "new_param",
      "action": "add_to_header"
    }
  ]
}
```

### 2. 오류 처리 플로우

#### 자동 복구 시도
1. **YAML 헤더 누락**: 최소한의 기본 헤더 생성 제안
2. **잘못된 데이터 타입**: 기본값으로 대체 제안
3. **파라미터 불일치**: 동기화 옵션 제공

#### 사용자 확인 필요
- 모든 자동 복구는 사용자 승인 후 실행
- "모두 동일하게 처리" 체크박스로 세션 단위 일괄 처리
- 원본 파일은 `.bak` 확장자로 백업 후 수정

## 로깅 시스템 설계

### 1. 로그 파일 구조

```
.promptory/logs/
├── app.log              # 일반 애플리케이션 로그
├── app.log.1            # 로테이션된 로그 파일
├── app.log.2
└── ...
```

### 2. 로그 형식

```
[2024-01-15T10:30:45.123Z] [INFO] [FileManager] Loaded 42 prompt files
[2024-01-15T10:30:46.234Z] [WARN] [SearchIndex] File parsing failed: development/broken.md
[2024-01-15T10:30:47.345Z] [ERROR] [FileWatcher] Failed to watch directory: permission denied
[2024-01-15T10:30:48.456Z] [DEBUG] [ParameterEngine] Detected parameter: {language}
```

### 3. 로그 로테이션 정책

- **최대 파일 수**: 10개 (사용자 설정 가능)
- **파일 크기 제한**: 10MB per 파일
- **보관 정책**: 가장 오래된 파일부터 삭제
- **압축**: 로테이션된 파일은 gzip 압축

## 성능 최적화 설계

### 1. 인덱싱 전략

#### 실시간 인덱스 업데이트
```javascript
// 파일 변경 감지 시 인덱스 부분 업데이트
async function updateFileIndex(filePath) {
  const fileData = await parsePromptFile(filePath);
  const index = await loadSearchIndex();
  
  // 기존 항목 찾기 (경로 또는 ID 기반)
  const existingIndex = index.files.findIndex(f => 
    f.path === filePath || f.id === fileData.id
  );
  
  if (existingIndex >= 0) {
    index.files[existingIndex] = fileData;
  } else {
    index.files.push(fileData);
  }
  
  await saveSearchIndex(index);
}
```

#### 검색 최적화
- **Fuse.js 설정**: 가중치 기반 검색 (title: 0.4, tags: 0.3, content: 0.3)
- **결과 제한**: 최대 100개 결과 (설정 가능)
- **디바운싱**: 검색어 입력 후 300ms 지연으로 성능 최적화

### 2. 메모리 관리

#### 지연 로딩
- 프롬프트 내용은 선택 시에만 로드
- 인덱스는 메타데이터만 메모리에 유지
- 대용량 파일은 스트리밍 방식으로 처리

#### 캐시 전략
- 최근 사용한 10개 파일 내용 캐시
- 태그 자동완성 데이터는 앱 시작 시 로드
- 검색 결과는 쿼리별로 5분간 캐시

## 백업 및 복구 설계

### 1. 자동 백업

#### 설정 파일 백업
- 설정 변경 시 자동으로 `.config.yaml.bak` 생성
- 최대 3개의 백업 파일 유지
- 손상 감지 시 최신 백업으로 자동 복구

#### 인덱스 파일 백업
- 인덱스 업데이트 전 백업 생성
- 앱 비정상 종료 시 백업에서 복구

### 2. 데이터 마이그레이션

#### 버전 업그레이드
```javascript
// 데이터 구조 버전 확인 및 마이그레이션
async function migrateDataStructure() {
  const config = await loadConfig();
  const currentVersion = config.app.version;
  
  if (semver.lt(currentVersion, '2.0.0')) {
    await migrateToV2();
  }
  
  // 버전별 마이그레이션 로직
}
```

#### 프로젝트 이동
- 전체 폴더 복사로 완전한 데이터 이동
- 절대 경로 참조 없이 상대 경로만 사용
- 설정 파일의 경로 정보 자동 업데이트

## 보안 설계

### 1. 파일 접근 제어

#### 권한 검증
- 읽기 권한: 파일 목록 스캔 전 확인
- 쓰기 권한: 파일 수정 전 확인
- 실행 권한: 스크립트 실행 방지

#### 경로 검증
```javascript
// 경로 순회 공격 방지
function validatePath(userPath, basePath) {
  const resolvedPath = path.resolve(basePath, userPath);
  const normalizedBase = path.normalize(basePath);
  
  if (!resolvedPath.startsWith(normalizedBase)) {
    throw new Error('Invalid path: directory traversal detected');
  }
  
  return resolvedPath;
}
```

### 2. 데이터 무결성

#### 파일 체크섬
- 중요 설정 파일의 MD5 체크섬 검증
- 손상 감지 시 사용자 알림 및 복구 옵션 제공

#### 입력 검증
- 모든 사용자 입력에 대한 길이 및 형식 검증
- XSS 방지를 위한 HTML 이스케이핑
- 파일명 특수문자 필터링

## 모니터링 및 유지보수

### 1. 성능 모니터링

#### 메트릭 수집
```javascript
const metrics = {
  fileCount: 0,
  indexSize: 0,
  searchLatency: [],
  memoryUsage: process.memoryUsage(),
  lastIndexUpdate: new Date()
};
```

#### 성능 임계값
- 검색 응답 시간: 500ms 초과 시 경고
- 메모리 사용량: 500MB 초과 시 경고
- 인덱스 크기: 50MB 초과 시 최적화 제안

### 2. 유지보수 도구

#### 인덱스 재구축
```bash
# 개발자 도구 메뉴
- "인덱스 재구축": 전체 인덱스 삭제 후 재생성
- "캐시 정리": 모든 캐시 파일 삭제
- "로그 정리": 오래된 로그 파일 삭제
```

#### 데이터 검증
- 정기적인 YAML 헤더 검증
- 파라미터 일치성 확인
- 깨진 링크 및 참조 검사

## 테스트 설계

### 1. 단위 테스트

#### 파일 파싱 테스트
```javascript
describe('PromptFileParser', () => {
  test('should parse valid YAML header', () => {
    const content = `---
title: "Test Prompt"
tags: ["test"]
---
Content here`;
    
    const result = parsePromptFile(content);
    expect(result.metadata.title).toBe('Test Prompt');
  });
});
```

#### 검색 인덱스 테스트
- 인덱스 생성/업데이트 로직 검증
- 검색 정확도 및 성능 테스트
- 파일 변경 감지 및 동기화 테스트

### 2. 통합 테스트

#### 파일 시스템 통합
- 실제 파일 생성/수정/삭제 시나리오
- 대용량 파일 처리 성능 테스트
- 동시 파일 접근 처리 테스트

#### 에러 복구 테스트
- 손상된 YAML 헤더 복구
- 인덱스 파일 손상 시 재구축
- 설정 파일 백업/복구 시나리오

### 3. 성능 테스트

#### 부하 테스트
- 1,000개 파일 로드 시간 측정
- 동시 검색 요청 처리 성능
- 메모리 사용량 프로파일링

## 향후 확장 고려사항

### 1. 클라우드 동기화 준비

#### 데이터 구조 호환성
- 모든 경로는 상대 경로로 저장
- 플랫폼별 차이점 최소화
- 충돌 해결 메커니즘 설계

### 2. 플러그인 시스템

#### 확장 포인트
- 파일 파싱 커스터마이징
- 검색 알고리즘 확장
- UI 컴포넌트 추가

### 3. 대용량 데이터 지원

#### 스케일링 전략
- 파티셔닝 기반 인덱스 분할
- 백그라운드 인덱싱 프로세스
- 압축 및 아카이빙 기능

이 설계서는 Promptory의 파일 기반 데이터 관리 시스템의 완전한 명세를 제공하며, 구현 과정에서 참조할 수 있는 상세한 가이드라인을 포함합니다.
