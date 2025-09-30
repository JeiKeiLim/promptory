/**
 * 프롬프트 템플릿 관련 타입 정의
 */

export interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea';
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: any;
  options?: string[]; // select 타입용
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  
  // 템플릿 내용
  content: string;
  parameters: TemplateParameter[];
  
  // 메타데이터
  metadata: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    useCase: string[];
    language: string;
    estimatedTime?: string;
    prerequisites?: string[];
  };
  
  // 사용 통계
  usage: {
    count: number;
    lastUsed?: string;
    rating?: number;
    reviews?: number;
  };
  
  // 공유 설정
  sharing: {
    isPublic: boolean;
    allowFork: boolean;
    license?: string;
  };
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  templates: string[]; // 템플릿 ID 배열
}

export interface TemplateCollection {
  id: string;
  name: string;
  description: string;
  templates: string[];
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

// 템플릿 생성/수정 요청
export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
  parameters: TemplateParameter[];
  metadata: PromptTemplate['metadata'];
  sharing: PromptTemplate['sharing'];
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  id: string;
}

// 템플릿 검색 필터
export interface TemplateFilter {
  category?: string;
  tags?: string[];
  difficulty?: PromptTemplate['metadata']['difficulty'];
  author?: string;
  language?: string;
  useCase?: string;
  rating?: number;
}

// 템플릿 사용 결과
export interface TemplateUsageResult {
  templateId: string;
  generatedContent: string;
  parameters: Record<string, any>;
  usedAt: string;
}
