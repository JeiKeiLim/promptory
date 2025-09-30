/**
 * 파일 시스템 관리 서비스
 * 프롬프트 파일의 CRUD 작업 담당
 */

import { promises as fs } from 'fs';
import { join, dirname, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PathValidator } from '../utils/pathValidator';
import { parsePromptFile, createMarkdownFile, YamlParseError } from '../utils/yamlParser';
import { CacheService } from './CacheService';
import type { 
  PromptFile, 
  PromptFileInfo, 
  PromptMetadata, 
  FileListOptions,
  FileError 
} from '@shared/types/prompt';

// 파일 생성 데이터
export interface FileCreateData {
  folderPath?: string;
  metadata: PromptMetadata;
  content: string;
}

// 파일 업데이트 데이터
export interface FileUpdateData {
  metadata?: PromptMetadata;
  content: string;
  newFolderPath?: string; // 폴더 이동을 위한 새 경로
}

export class FileService {
  private pathValidator: PathValidator;
  private projectPath: string;
  private cacheService: CacheService;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.pathValidator = new PathValidator(projectPath);
    this.cacheService = new CacheService(projectPath);
  }

  /**
   * 서비스 초기화 (캐시 서비스 포함)
   */
  async initialize(): Promise<void> {
    await this.cacheService.initialize();
  }

  /**
   * 프로젝트 경로 변경
   * @param newProjectPath - 새로운 프로젝트 경로
   */
  async setProjectPath(newProjectPath: string): Promise<void> {
    this.projectPath = newProjectPath;
    this.pathValidator.setBasePath(newProjectPath);
    await this.cacheService.switchProject(newProjectPath);
  }

  /**
   * 프롬프트 파일 목록 조회
   * @param options - 목록 조회 옵션
   * @returns 프롬프트 파일 정보 배열
   */
  async listFiles(options: FileListOptions = {}): Promise<PromptFileInfo[]> {
    try {
      const files = await this.scanDirectory(this.projectPath);
      const promptFiles: PromptFileInfo[] = [];

      for (const filePath of files) {
        try {
          const fileInfo = await this.getFileInfo(filePath, options.includeContent);
          promptFiles.push(fileInfo);
        } catch (error) {
          // 개별 파일 오류는 로그만 남기고 계속 진행
          console.warn(`Failed to process file ${filePath}:`, error);
          
          // 오류가 있는 파일도 목록에 포함 (오류 정보와 함께)
          const stats = await fs.stat(filePath);
          const errorInfo: FileError = {
            type: error instanceof YamlParseError ? 'YAML_PARSE_ERROR' : 'FILE_READ_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error'
          };

          promptFiles.push({
            id: uuidv4(),
            path: this.pathValidator.getRelativePath(filePath),
            metadata: {
              title: 'Error: ' + filePath.split('/').pop(),
              tags: [],
              favorite: false,
              created_at: stats.birthtime.toISOString(),
              parameters: []
            },
            modifiedAt: stats.mtime.toISOString(),
            fileSize: stats.size,
            error: errorInfo
          });
        }
      }

      // 정렬
      return this.sortFiles(promptFiles, options.sortBy, options.sortOrder);
    } catch (error) {
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 프롬프트 파일 읽기
   * @param relativePath - 상대 경로
   * @returns 프롬프트 파일 전체 정보
   */
  async readFile(relativePath: string): Promise<PromptFile> {
    try {
      const absolutePath = this.pathValidator.validatePath(relativePath);
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      const stats = await fs.stat(absolutePath);
      
      const parsed = parsePromptFile(fileContent);
      
      return {
        id: this.generateFileId(relativePath, parsed.metadata.created_at),
        path: relativePath,
        metadata: parsed.metadata,
        content: parsed.content,
        rawContent: parsed.rawContent,
        modifiedAt: stats.mtime.toISOString(),
        fileSize: stats.size
      };
    } catch (error) {
      if (error instanceof YamlParseError) {
        throw error;
      }
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 새 프롬프트 파일 생성
   * @param data - 파일 생성 데이터
   * @returns 생성된 파일의 상대 경로
   */
  async createFile(data: FileCreateData): Promise<string> {
    try {
      // 파일명 생성
      const fileName = this.pathValidator.sanitizeFileName(data.metadata.title) + '.md';
      
      // 파일 경로 구성
      const folderPath = data.folderPath || '';
      const relativePath = join(folderPath, fileName);
      const absolutePath = this.pathValidator.validatePath(relativePath);
      
      // 디렉토리 생성 (필요한 경우)
      const dir = dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });
      
      // 파일 존재 여부 확인
      try {
        await fs.access(absolutePath);
        throw new Error(`File already exists: ${relativePath}`);
      } catch (error) {
        // 파일이 존재하지 않으면 계속 진행
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
      
      // created_at이 없으면 현재 시간으로 설정
      if (!data.metadata.created_at) {
        data.metadata.created_at = new Date().toISOString();
      }
      
      // 마크다운 파일 내용 생성
      const fileContent = createMarkdownFile(data.metadata, data.content);
      
      // 파일 쓰기
      await fs.writeFile(absolutePath, fileContent, 'utf-8');
      
      // 캐시 업데이트
      try {
        const fileInfo = await this.getFileInfo(absolutePath, false);
        await this.cacheService.upsertSearchIndex(fileInfo, data.content);
        await this.cacheService.updateTagCache(data.metadata.tags);
      } catch (cacheError) {
        console.warn('Failed to update cache for new file:', cacheError);
      }
      
      return relativePath;
    } catch (error) {
      throw new Error(`Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 프롬프트 파일 업데이트
   * @param relativePath - 상대 경로
   * @param data - 업데이트 데이터
   */
  async updateFile(relativePath: string, data: FileUpdateData): Promise<void> {
    try {
      const absolutePath = this.pathValidator.validatePath(relativePath);
      
      // 파일 존재 여부 확인
      await fs.access(absolutePath);
      
      // content가 이미 전체 마크다운(YAML 포함)이면 그대로 사용
      // metadata가 있으면 createMarkdownFile로 생성
      const fileContent = data.metadata 
        ? createMarkdownFile(data.metadata, data.content)
        : data.content;
      
      // 폴더 이동이 필요한 경우
      if (data.newFolderPath !== undefined) {
        const fileName = relativePath.split('/').pop() || 'untitled.md';
        const newRelativePath = data.newFolderPath 
          ? `${data.newFolderPath}/${fileName}`
          : fileName;
        const newAbsolutePath = this.pathValidator.validatePath(newRelativePath);
        
        // 새 폴더가 없으면 생성
        const newDir = dirname(newAbsolutePath);
        await fs.mkdir(newDir, { recursive: true });
        
        // 파일을 새 위치로 이동 (내용 업데이트 포함)
        await fs.writeFile(newAbsolutePath, fileContent, 'utf-8');
        
        // 기존 파일 삭제
        if (absolutePath !== newAbsolutePath) {
          await fs.unlink(absolutePath);
          
          // 캐시에서 이전 파일 제거
          try {
            await this.cacheService.removeFromSearchIndex(relativePath);
          } catch (cacheError) {
            console.warn('Failed to remove old file from cache:', cacheError);
          }
        }
        
        // 캐시 업데이트 (새 경로로)
        try {
          const fileInfo = await this.getFileInfo(newAbsolutePath, false);
          await this.cacheService.upsertSearchIndex(fileInfo, data.content);
          if (data.metadata) {
            await this.cacheService.updateTagCache(data.metadata.tags);
          }
        } catch (cacheError) {
          console.warn('Failed to update cache for moved file:', cacheError);
        }
      } else {
        // 폴더 이동 없이 내용만 업데이트
        await fs.writeFile(absolutePath, fileContent, 'utf-8');
        
        // 캐시 업데이트
        try {
          const fileInfo = await this.getFileInfo(absolutePath, false);
          await this.cacheService.upsertSearchIndex(fileInfo, data.content);
          if (data.metadata) {
            await this.cacheService.updateTagCache(data.metadata.tags);
          }
        } catch (cacheError) {
          console.warn('Failed to update cache for updated file:', cacheError);
        }
      }
    } catch (error) {
      throw new Error(`Failed to update file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 프롬프트 파일 삭제
   * @param relativePath - 상대 경로
   * @param createBackup - 백업 생성 여부
   * @returns 백업 파일 경로 (백업 생성 시)
   */
  async deleteFile(relativePath: string, createBackup: boolean = false): Promise<string | undefined> {
    try {
      const absolutePath = this.pathValidator.validatePath(relativePath);
      
      let backupPath: string | undefined;
      
      if (createBackup) {
        // 백업 파일 생성
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `${relativePath}.${timestamp}.bak`;
        const backupAbsolutePath = this.pathValidator.validatePath(backupFileName);
        
        await fs.copyFile(absolutePath, backupAbsolutePath);
        backupPath = backupFileName;
      }
      
      // 캐시에서 제거 (파일 삭제 전에 ID 조회)
      try {
        const fileInfo = await this.getFileInfo(absolutePath, false);
        await this.cacheService.removeFromSearchIndex(fileInfo.id);
      } catch (cacheError) {
        console.warn('Failed to remove from cache:', cacheError);
      }
      
      // 원본 파일 삭제
      await fs.unlink(absolutePath);
      
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 폴더 목록 가져오기
   * @returns 폴더 목록 (이름과 파일 개수)
   */
  async listFolders(): Promise<Array<{ name: string; path: string; count: number }>> {
    try {
      const folders: Array<{ name: string; path: string; count: number }> = [];
      
      // 재귀적으로 폴더 스캔
      const scanFolders = async (dirPath: string, relativePath: string = '') => {
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          
          for (const entry of entries) {
            // 숨김 폴더 제외
            if (entry.name.startsWith('.')) {
              continue;
            }
            
            if (entry.isDirectory()) {
              const fullPath = join(dirPath, entry.name);
              const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
              
              // 이 폴더의 .md 파일 개수 세기
              const files = await fs.readdir(fullPath);
              const mdCount = files.filter(f => f.endsWith('.md')).length;
              
              folders.push({
                name: entry.name,
                path: relPath,
                count: mdCount
              });
              
              // 하위 폴더도 스캔
              await scanFolders(fullPath, relPath);
            }
          }
        } catch (error) {
          console.warn(`Cannot access directory ${dirPath}:`, error);
        }
      };
      
      await scanFolders(this.projectPath);
      
      return folders.sort((a, b) => a.path.localeCompare(b.path));
    } catch (error) {
      throw new Error(`Failed to list folders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 폴더 생성
   * @param folderName - 생성할 폴더 이름
   * @returns 생성된 폴더의 상대 경로
   */
  async createFolder(folderName: string): Promise<string> {
    try {
      // 폴더 이름 검증
      const sanitized = this.pathValidator.sanitizeFileName(folderName);
      
      // 프로젝트 루트 기준 절대 경로 생성
      const absolutePath = join(this.projectPath, sanitized);
      
      // 폴더가 이미 존재하는지 확인
      try {
        await fs.access(absolutePath);
        throw new Error(`Folder already exists: ${sanitized}`);
      } catch (error: any) {
        // ENOENT 오류는 정상 (폴더가 없음)
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
      
      // 폴더 생성
      await fs.mkdir(absolutePath, { recursive: true });
      
      // 상대 경로 반환
      return sanitized;
    } catch (error) {
      throw new Error(`Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 디렉토리 스캔하여 .md 파일 찾기
   * @param dirPath - 스캔할 디렉토리 경로
   * @returns 마크다운 파일 경로 배열
   */
  private async scanDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        // 숨김 파일/폴더 제외
        if (entry.name.startsWith('.')) {
          continue;
        }
        
        if (entry.isDirectory()) {
          // 재귀적으로 하위 디렉토리 스캔
          const subFiles = await this.scanDirectory(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && extname(entry.name) === '.md') {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // 디렉토리 접근 오류는 무시
      console.warn(`Cannot access directory ${dirPath}:`, error);
    }
    
    return files;
  }

  /**
   * 파일 정보 조회
   * @param absolutePath - 절대 경로
   * @param includeContent - 내용 포함 여부
   * @returns 파일 정보
   */
  private async getFileInfo(absolutePath: string, includeContent: boolean = false): Promise<PromptFileInfo> {
    const stats = await fs.stat(absolutePath);
    const relativePath = this.pathValidator.getRelativePath(absolutePath);
    
    if (includeContent) {
      const file = await this.readFile(relativePath);
      return {
        id: file.id,
        path: file.path,
        metadata: file.metadata,
        modifiedAt: file.modifiedAt,
        fileSize: file.fileSize,
        error: file.error
      };
    } else {
      // 메타데이터만 파싱
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      const parsed = parsePromptFile(fileContent);
      
      return {
        id: this.generateFileId(relativePath, parsed.metadata.created_at),
        path: relativePath,
        metadata: parsed.metadata,
        modifiedAt: stats.mtime.toISOString(),
        fileSize: stats.size
      };
    }
  }

  /**
   * 파일 ID 생성
   * @param path - 파일 경로
   * @param createdAt - 생성 시간
   * @returns 고유 ID
   */
  private generateFileId(path: string, createdAt: string): string {
    // 경로와 생성 시간을 조합하여 일관된 ID 생성
    return Buffer.from(`${path}:${createdAt}`).toString('base64');
  }

  /**
   * 파일 목록 정렬
   * @param files - 파일 배열
   * @param sortBy - 정렬 기준
   * @param sortOrder - 정렬 순서
   * @returns 정렬된 파일 배열
   */
  private sortFiles(
    files: PromptFileInfo[], 
    sortBy: 'name' | 'modified' | 'created' = 'modified',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): PromptFileInfo[] {
    return files.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.metadata.title.localeCompare(b.metadata.title);
          break;
        case 'modified':
          comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
          break;
        case 'created':
          comparison = new Date(a.metadata.created_at).getTime() - new Date(b.metadata.created_at).getTime();
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }
}
