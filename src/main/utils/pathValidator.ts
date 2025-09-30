/**
 * 경로 검증 유틸리티
 * 디렉토리 순회 공격 방지 및 파일명 검증
 */

import { resolve, normalize, basename } from 'path';

export class PathValidator {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = resolve(basePath);
  }

  /**
   * 사용자 입력 경로를 검증하고 안전한 절대 경로 반환
   * @param userPath - 사용자가 입력한 경로
   * @returns 검증된 절대 경로
   * @throws Error - 유효하지 않은 경로인 경우
   */
  validatePath(userPath: string): string {
    const resolvedPath = resolve(this.basePath, userPath);
    const normalizedBase = normalize(this.basePath);
    
    // 디렉토리 순회 공격 방지
    if (!resolvedPath.startsWith(normalizedBase)) {
      throw new Error('Invalid path: directory traversal detected');
    }
    
    // 시스템 디렉토리 접근 방지
    const forbiddenPaths = ['/etc', '/usr', '/System', 'C:\\Windows', 'C:\\Program Files'];
    if (forbiddenPaths.some(forbidden => resolvedPath.startsWith(forbidden))) {
      throw new Error('Access to system directories is forbidden');
    }
    
    return resolvedPath;
  }

  /**
   * 파일명 유효성 검증
   * @param fileName - 검증할 파일명
   * @returns 유효한 파일명인지 여부
   */
  validateFileName(fileName: string): boolean {
    // 빈 문자열 체크
    if (!fileName || fileName.trim().length === 0) {
      return false;
    }

    // 금지된 문자 체크
    const forbiddenChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (forbiddenChars.test(fileName)) {
      return false;
    }
    
    // 예약된 이름 체크 (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (reservedNames.test(fileName.replace(/\.[^.]*$/, ''))) {
      return false;
    }
    
    // 길이 제한 (255자)
    if (fileName.length > 255) {
      return false;
    }
    
    return true;
  }

  /**
   * 제목을 안전한 파일명으로 변환
   * @param title - 프롬프트 제목
   * @returns 안전한 파일명
   */
  sanitizeFileName(title: string): string {
    // 특수문자를 하이픈으로 변환
    let sanitized = title
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
      .replace(/\s+/g, '-') // 공백을 하이픈으로
      .replace(/-+/g, '-') // 연속된 하이픈을 하나로
      .replace(/^-|-$/g, ''); // 시작/끝 하이픈 제거

    // 빈 문자열이면 기본값 사용
    if (!sanitized) {
      sanitized = 'untitled';
    }

    // 길이 제한 (확장자 고려하여 250자)
    if (sanitized.length > 250) {
      sanitized = sanitized.substring(0, 250);
    }

    return sanitized;
  }

  /**
   * 베이스 경로 변경
   * @param newBasePath - 새로운 베이스 경로
   */
  setBasePath(newBasePath: string): void {
    this.basePath = resolve(newBasePath);
  }

  /**
   * 현재 베이스 경로 반환
   * @returns 현재 베이스 경로
   */
  getBasePath(): string {
    return this.basePath;
  }

  /**
   * 상대 경로로 변환
   * @param absolutePath - 절대 경로
   * @returns 베이스 경로 기준 상대 경로
   */
  getRelativePath(absolutePath: string): string {
    const normalizedBase = normalize(this.basePath);
    const normalizedPath = normalize(absolutePath);
    
    if (normalizedPath.startsWith(normalizedBase)) {
      return normalizedPath.substring(normalizedBase.length + 1);
    }
    
    return absolutePath;
  }
}

