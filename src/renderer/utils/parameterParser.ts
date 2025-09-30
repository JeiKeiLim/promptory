/**
 * 파라미터 파싱 및 관리 유틸리티
 */

import type { PromptParameter } from '@shared/types/prompt';

// 파라미터 패턴 정규식: {{parameter_name}}
const PARAMETER_REGEX = /\{\{([a-zA-Z가-힣][a-zA-Z0-9가-힣_]*)\}\}/g;

// 파라미터 정보
export interface ParsedParameter {
  name: string;
  occurrences: number;
  positions: Array<{ start: number; end: number; line: number; column: number }>;
}

/**
 * 마크다운 텍스트에서 파라미터를 추출합니다.
 * @param content - 마크다운 내용
 * @returns 파싱된 파라미터 목록
 */
export function parseParameters(content: string): ParsedParameter[] {
  const parameters = new Map<string, ParsedParameter>();
  const lines = content.split('\n');
  
  let match;
  let globalOffset = 0;
  
  // 각 라인별로 파라미터 검색
  lines.forEach((line, lineIndex) => {
    const lineRegex = new RegExp(PARAMETER_REGEX.source, 'g');
    let lineMatch;
    
    while ((lineMatch = lineRegex.exec(line)) !== null) {
      const paramName = lineMatch[1];
      const start = globalOffset + lineMatch.index;
      const end = start + lineMatch[0].length;
      const column = lineMatch.index;
      
      if (!parameters.has(paramName)) {
        parameters.set(paramName, {
          name: paramName,
          occurrences: 0,
          positions: []
        });
      }
      
      const param = parameters.get(paramName)!;
      param.occurrences++;
      param.positions.push({
        start,
        end,
        line: lineIndex,
        column
      });
    }
    
    globalOffset += line.length + 1; // +1 for newline character
  });
  
  return Array.from(parameters.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * 파싱된 파라미터를 PromptParameter 형식으로 변환합니다.
 * @param parsedParams - 파싱된 파라미터 목록
 * @param existingParams - 기존 파라미터 설정 (타입, 설명 등 보존)
 * @returns PromptParameter 배열
 */
export function convertToPromptParameters(
  parsedParams: ParsedParameter[],
  existingParams: PromptParameter[] = []
): PromptParameter[] {
  const existingParamMap = new Map(
    existingParams.map(param => [param.name, param])
  );
  
  return parsedParams.map(parsed => {
    const existing = existingParamMap.get(parsed.name);
    
    return {
      name: parsed.name,
      type: existing?.type || 'string', // 기본값: string
      required: existing?.required ?? true, // 기본값: true
      description: existing?.description || `${parsed.name} 파라미터`,
      options: existing?.options || undefined
    };
  });
}

/**
 * 파라미터 이름의 유효성을 검사합니다.
 * @param name - 파라미터 이름
 * @returns 유효성 검사 결과
 */
export function validateParameterName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: '파라미터 이름이 필요합니다.' };
  }
  
  if (!/^[a-zA-Z가-힣][a-zA-Z0-9가-힣_]*$/.test(name)) {
    return { 
      isValid: false, 
      error: '파라미터 이름은 문자로 시작하고 문자, 숫자, 밑줄만 포함할 수 있습니다.' 
    };
  }
  
  if (name.length > 50) {
    return { isValid: false, error: '파라미터 이름은 50자를 초과할 수 없습니다.' };
  }
  
  return { isValid: true };
}

/**
 * 파라미터 값으로 템플릿을 렌더링합니다.
 * @param template - 템플릿 문자열
 * @param values - 파라미터 값 맵
 * @returns 렌더링된 문자열
 */
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(PARAMETER_REGEX, (match, paramName) => {
    return values[paramName] || match; // 값이 없으면 원본 유지
  });
}

/**
 * 파라미터 통계 정보를 생성합니다.
 * @param parsedParams - 파싱된 파라미터 목록
 * @returns 통계 정보
 */
export function getParameterStats(parsedParams: ParsedParameter[]) {
  const totalParams = parsedParams.length;
  const totalOccurrences = parsedParams.reduce((sum, param) => sum + param.occurrences, 0);
  const mostUsed = parsedParams.reduce((max, param) => 
    param.occurrences > max.occurrences ? param : max, 
    parsedParams[0] || { name: '', occurrences: 0 }
  );
  
  return {
    totalParams,
    totalOccurrences,
    mostUsed: mostUsed.name,
    averageOccurrences: totalParams > 0 ? Math.round(totalOccurrences / totalParams * 10) / 10 : 0
  };
}

/**
 * 파라미터 하이라이팅을 위한 위치 정보를 반환합니다.
 * @param content - 마크다운 내용
 * @returns 하이라이팅 범위 배열
 */
export function getParameterHighlights(content: string): Array<{ start: number; end: number; paramName: string }> {
  const highlights: Array<{ start: number; end: number; paramName: string }> = [];
  let match;
  
  const regex = new RegExp(PARAMETER_REGEX.source, 'g');
  while ((match = regex.exec(content)) !== null) {
    highlights.push({
      start: match.index,
      end: match.index + match[0].length,
      paramName: match[1]
    });
  }
  
  return highlights;
}

