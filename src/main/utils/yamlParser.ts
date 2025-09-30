/**
 * YAML 헤더 파싱 유틸리티
 * 마크다운 파일의 YAML 헤더를 파싱하고 검증
 */

import * as yaml from 'js-yaml';
import type { PromptMetadata, PromptParameter } from '@shared/types/prompt';

// YAML 파싱 결과
export interface ParsedPromptFile {
  metadata: PromptMetadata;
  content: string;
  rawContent: string;
}

// YAML 파싱 오류
export class YamlParseError extends Error {
  constructor(message: string, public line?: number, public column?: number) {
    super(message);
    this.name = 'YamlParseError';
  }
}

/**
 * 마크다운 파일에서 YAML 헤더와 내용 분리
 * @param fileContent - 파일 전체 내용
 * @returns YAML 헤더와 마크다운 내용
 */
export function separateYamlAndContent(fileContent: string): { yamlHeader: string; content: string } {
  const lines = fileContent.split('\n');
  
  // YAML 헤더 시작 확인
  if (lines[0] !== '---') {
    throw new YamlParseError('YAML header not found: file must start with "---"');
  }
  
  // YAML 헤더 끝 찾기
  let yamlEndIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      yamlEndIndex = i;
      break;
    }
  }
  
  if (yamlEndIndex === -1) {
    throw new YamlParseError('YAML header not properly closed: missing closing "---"');
  }
  
  const yamlHeader = lines.slice(1, yamlEndIndex).join('\n');
  const content = lines.slice(yamlEndIndex + 1).join('\n').trim();
  
  return { yamlHeader, content };
}

/**
 * YAML 헤더를 PromptMetadata로 파싱
 * @param yamlHeader - YAML 헤더 문자열
 * @returns 파싱된 메타데이터
 */
export function parseYamlHeader(yamlHeader: string): PromptMetadata {
  try {
    const parsed = yaml.load(yamlHeader) as any;
    
    if (!parsed || typeof parsed !== 'object') {
      throw new YamlParseError('Invalid YAML: must be an object');
    }
    
    // 필수 필드 검증
    if (!parsed.title || typeof parsed.title !== 'string') {
      throw new YamlParseError('Missing or invalid "title" field');
    }
    
    if (!parsed.created_at || typeof parsed.created_at !== 'string') {
      throw new YamlParseError('Missing or invalid "created_at" field');
    }
    
    // 날짜 형식 검증
    const createdAt = new Date(parsed.created_at);
    if (isNaN(createdAt.getTime())) {
      throw new YamlParseError('Invalid "created_at" date format');
    }
    
    // 메타데이터 구성
    const metadata: PromptMetadata = {
      title: parsed.title.trim(),
      description: typeof parsed.description === 'string' ? parsed.description.trim() : undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((tag: any) => typeof tag === 'string') : [],
      favorite: Boolean(parsed.favorite),
      created_at: parsed.created_at,
      parameters: []
    };
    
    // 파라미터 검증 및 파싱
    if (parsed.parameters && Array.isArray(parsed.parameters)) {
      metadata.parameters = parsed.parameters.map((param: any, index: number) => {
        return validateParameter(param, index);
      });
    }
    
    return metadata;
    
  } catch (error) {
    if (error instanceof YamlParseError) {
      throw error;
    }
    
    if (error instanceof yaml.YAMLException) {
      throw new YamlParseError(
        `YAML parsing error: ${error.message}`,
        error.mark?.line,
        error.mark?.column
      );
    }
    
    throw new YamlParseError(`Unknown parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 파라미터 객체 검증
 * @param param - 파라미터 객체
 * @param index - 파라미터 인덱스 (오류 메시지용)
 * @returns 검증된 파라미터
 */
function validateParameter(param: any, index: number): PromptParameter {
  if (!param || typeof param !== 'object') {
    throw new YamlParseError(`Parameter ${index}: must be an object`);
  }
  
  // name 필드 검증
  if (!param.name || typeof param.name !== 'string') {
    throw new YamlParseError(`Parameter ${index}: missing or invalid "name" field`);
  }
  
  // 파라미터명 규칙 검증 (영문, 숫자, 언더스코어, 한글, 숫자로 시작 불가)
  const namePattern = /^[a-zA-Z가-힣][a-zA-Z0-9가-힣_]*$/;
  if (!namePattern.test(param.name)) {
    throw new YamlParseError(
      `Parameter ${index}: invalid name "${param.name}". Must start with letter and contain only letters, numbers, underscores, and Korean characters`
    );
  }
  
  // type 필드 검증
  if (!param.type || !['string', 'category'].includes(param.type)) {
    throw new YamlParseError(`Parameter ${index}: "type" must be "string" or "category"`);
  }
  
  const validatedParam: PromptParameter = {
    name: param.name,
    type: param.type,
    required: Boolean(param.required !== false), // 기본값은 true
    description: typeof param.description === 'string' ? param.description.trim() : undefined
  };
  
  // category 타입인 경우 options 필수
  if (param.type === 'category') {
    if (!Array.isArray(param.options) || param.options.length === 0) {
      throw new YamlParseError(`Parameter ${index}: "category" type requires non-empty "options" array`);
    }
    
    validatedParam.options = param.options.filter((option: any) => typeof option === 'string');
    
    if (validatedParam.options && validatedParam.options.length === 0) {
      throw new YamlParseError(`Parameter ${index}: "options" must contain at least one string`);
    }
  }
  
  return validatedParam;
}

/**
 * PromptMetadata를 YAML 문자열로 변환
 * @param metadata - 메타데이터
 * @returns YAML 문자열
 */
export function metadataToYaml(metadata: PromptMetadata): string {
  const yamlObject = {
    title: metadata.title,
    ...(metadata.description && { description: metadata.description }),
    tags: metadata.tags,
    favorite: metadata.favorite,
    created_at: metadata.created_at,
    ...(metadata.parameters.length > 0 && { parameters: metadata.parameters })
  };
  
  return yaml.dump(yamlObject, {
    indent: 2,
    lineWidth: -1, // 줄바꿈 없음
    noRefs: true,
    sortKeys: false
  });
}

/**
 * 완전한 마크다운 파일 내용 생성
 * @param metadata - 메타데이터
 * @param content - 마크다운 내용
 * @returns 완전한 파일 내용
 */
export function createMarkdownFile(metadata: PromptMetadata, content: string): string {
  const yamlHeader = metadataToYaml(metadata);
  return `---\n${yamlHeader}---\n\n${content}`;
}

/**
 * 마크다운 파일 파싱
 * @param fileContent - 파일 전체 내용
 * @returns 파싱된 프롬프트 파일
 */
export function parsePromptFile(fileContent: string): ParsedPromptFile {
  const { yamlHeader, content } = separateYamlAndContent(fileContent);
  const metadata = parseYamlHeader(yamlHeader);
  
  return {
    metadata,
    content,
    rawContent: fileContent
  };
}
