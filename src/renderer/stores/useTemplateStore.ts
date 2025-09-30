/**
 * 프롬프트 템플릿 상태 관리
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  PromptTemplate, 
  TemplateCategory, 
  TemplateCollection,
  TemplateFilter,
  CreateTemplateRequest,
  UpdateTemplateRequest 
} from '@shared/types/template';

interface TemplateStore {
  // 상태
  templates: PromptTemplate[];
  categories: TemplateCategory[];
  collections: TemplateCollection[];
  selectedTemplate: PromptTemplate | null;
  selectedCategory: string | null;
  selectedCollection: string | null;
  
  // UI 상태
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  filter: TemplateFilter;
  
  // 모달 상태
  templateModal: {
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view' | 'use';
    template?: PromptTemplate;
  };
  
  // 액션
  // 템플릿 관리
  loadTemplates: () => Promise<void>;
  createTemplate: (template: CreateTemplateRequest) => Promise<void>;
  updateTemplate: (template: UpdateTemplateRequest) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string) => Promise<void>;
  
  // 템플릿 사용
  useTemplate: (id: string, parameters: Record<string, any>) => Promise<string>;
  
  // 카테고리 관리
  loadCategories: () => Promise<void>;
  createCategory: (category: Omit<TemplateCategory, 'id' | 'templates'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<TemplateCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // 컬렉션 관리
  loadCollections: () => Promise<void>;
  createCollection: (collection: Omit<TemplateCollection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCollection: (id: string, updates: Partial<TemplateCollection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addToCollection: (collectionId: string, templateId: string) => Promise<void>;
  removeFromCollection: (collectionId: string, templateId: string) => Promise<void>;
  
  // 검색 및 필터링
  setSearchTerm: (term: string) => void;
  setFilter: (filter: Partial<TemplateFilter>) => void;
  clearFilter: () => void;
  getFilteredTemplates: () => PromptTemplate[];
  
  // 선택 관리
  selectTemplate: (template: PromptTemplate | null) => void;
  selectCategory: (categoryId: string | null) => void;
  selectCollection: (collectionId: string | null) => void;
  
  // 모달 관리
  showTemplateModal: (mode: 'create' | 'edit' | 'view' | 'use', template?: PromptTemplate) => void;
  hideTemplateModal: () => void;
  
  // 유틸리티
  refreshData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// 기본 카테고리
const defaultCategories: TemplateCategory[] = [
  {
    id: 'writing',
    name: '글쓰기',
    description: '블로그, 기사, 창작 등 글쓰기 관련 템플릿',
    icon: '✍️',
    color: '#3B82F6',
    templates: []
  },
  {
    id: 'coding',
    name: '코딩',
    description: '코드 생성, 리뷰, 디버깅 등 개발 관련 템플릿',
    icon: '💻',
    color: '#10B981',
    templates: []
  },
  {
    id: 'analysis',
    name: '분석',
    description: '데이터 분석, 리서치, 보고서 작성 템플릿',
    icon: '📊',
    color: '#F59E0B',
    templates: []
  },
  {
    id: 'education',
    name: '교육',
    description: '학습, 교육, 설명 관련 템플릿',
    icon: '🎓',
    color: '#8B5CF6',
    templates: []
  },
  {
    id: 'business',
    name: '비즈니스',
    description: '기획, 마케팅, 제안서 등 비즈니스 템플릿',
    icon: '💼',
    color: '#EF4444',
    templates: []
  },
  {
    id: 'creative',
    name: '창작',
    description: '아이디어 생성, 브레인스토밍, 창의적 작업 템플릿',
    icon: '🎨',
    color: '#EC4899',
    templates: []
  }
];

// 기본 컬렉션
const defaultCollections: TemplateCollection[] = [
  {
    id: 'favorites',
    name: '즐겨찾기',
    description: '자주 사용하는 템플릿 모음',
    templates: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true
  },
  {
    id: 'recent',
    name: '최근 사용',
    description: '최근에 사용한 템플릿 모음',
    templates: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true
  }
];

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      // 초기 상태
      templates: [],
      categories: defaultCategories,
      collections: defaultCollections,
      selectedTemplate: null,
      selectedCategory: null,
      selectedCollection: null,
      
      isLoading: false,
      error: null,
      searchTerm: '',
      filter: {},
      
      templateModal: {
        isOpen: false,
        mode: 'view'
      },
      
      // 템플릿 관리 액션
      loadTemplates: async () => {
        set({ isLoading: true, error: null });
        try {
          // TODO: API 호출로 템플릿 로드
          // const templates = await templateAPI.getTemplates();
          // set({ templates });
          
          // 임시로 빈 배열 설정
          set({ templates: [] });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '템플릿 로드 실패' });
        } finally {
          set({ isLoading: false });
        }
      },
      
      createTemplate: async (templateData: CreateTemplateRequest) => {
        set({ isLoading: true, error: null });
        try {
          const newTemplate: PromptTemplate = {
            id: Date.now().toString(),
            ...templateData,
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usage: {
              count: 0,
              rating: 0,
              reviews: 0
            }
          };
          
          set(state => ({
            templates: [...state.templates, newTemplate]
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '템플릿 생성 실패' });
        } finally {
          set({ isLoading: false });
        }
      },
      
      updateTemplate: async (templateData: UpdateTemplateRequest) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            templates: state.templates.map(template =>
              template.id === templateData.id
                ? { ...template, ...templateData, updatedAt: new Date().toISOString() }
                : template
            )
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '템플릿 수정 실패' });
        } finally {
          set({ isLoading: false });
        }
      },
      
      deleteTemplate: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            templates: state.templates.filter(template => template.id !== id),
            selectedTemplate: state.selectedTemplate?.id === id ? null : state.selectedTemplate
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '템플릿 삭제 실패' });
        } finally {
          set({ isLoading: false });
        }
      },
      
      duplicateTemplate: async (id: string) => {
        const template = get().templates.find(t => t.id === id);
        if (template) {
          const duplicated: PromptTemplate = {
            ...template,
            id: Date.now().toString(),
            name: `${template.name} (복사본)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usage: {
              count: 0,
              rating: 0,
              reviews: 0
            }
          };
          
          set(state => ({
            templates: [...state.templates, duplicated]
          }));
        }
      },
      
      useTemplate: async (id: string, parameters: Record<string, any>) => {
        const template = get().templates.find(t => t.id === id);
        if (!template) {
          throw new Error('템플릿을 찾을 수 없습니다');
        }
        
        // 파라미터를 템플릿 내용에 적용
        let content = template.content;
        Object.entries(parameters).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          content = content.replace(regex, String(value));
        });
        
        // 사용 통계 업데이트
        set(state => ({
          templates: state.templates.map(t =>
            t.id === id
              ? {
                  ...t,
                  usage: {
                    ...t.usage,
                    count: t.usage.count + 1,
                    lastUsed: new Date().toISOString()
                  }
                }
              : t
          )
        }));
        
        return content;
      },
      
      // 카테고리 관리
      loadCategories: async () => {
        // 이미 기본 카테고리가 있으므로 추가 로딩 불필요
      },
      
      createCategory: async (categoryData) => {
        const newCategory: TemplateCategory = {
          ...categoryData,
          id: Date.now().toString(),
          templates: []
        };
        
        set(state => ({
          categories: [...state.categories, newCategory]
        }));
      },
      
      updateCategory: async (id: string, updates: Partial<TemplateCategory>) => {
        set(state => ({
          categories: state.categories.map(category =>
            category.id === id ? { ...category, ...updates } : category
          )
        }));
      },
      
      deleteCategory: async (id: string) => {
        set(state => ({
          categories: state.categories.filter(category => category.id !== id),
          selectedCategory: state.selectedCategory === id ? null : state.selectedCategory
        }));
      },
      
      // 컬렉션 관리
      loadCollections: async () => {
        // 기본 컬렉션이 이미 있으므로 추가 로딩 불필요
      },
      
      createCollection: async (collectionData) => {
        const newCollection: TemplateCollection = {
          ...collectionData,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        set(state => ({
          collections: [...state.collections, newCollection]
        }));
      },
      
      updateCollection: async (id: string, updates: Partial<TemplateCollection>) => {
        set(state => ({
          collections: state.collections.map(collection =>
            collection.id === id
              ? { ...collection, ...updates, updatedAt: new Date().toISOString() }
              : collection
          )
        }));
      },
      
      deleteCollection: async (id: string) => {
        set(state => ({
          collections: state.collections.filter(collection => collection.id !== id && !collection.isDefault),
          selectedCollection: state.selectedCollection === id ? null : state.selectedCollection
        }));
      },
      
      addToCollection: async (collectionId: string, templateId: string) => {
        set(state => ({
          collections: state.collections.map(collection =>
            collection.id === collectionId && !collection.templates.includes(templateId)
              ? {
                  ...collection,
                  templates: [...collection.templates, templateId],
                  updatedAt: new Date().toISOString()
                }
              : collection
          )
        }));
      },
      
      removeFromCollection: async (collectionId: string, templateId: string) => {
        set(state => ({
          collections: state.collections.map(collection =>
            collection.id === collectionId
              ? {
                  ...collection,
                  templates: collection.templates.filter(id => id !== templateId),
                  updatedAt: new Date().toISOString()
                }
              : collection
          )
        }));
      },
      
      // 검색 및 필터링
      setSearchTerm: (term: string) => {
        set({ searchTerm: term });
      },
      
      setFilter: (filter: Partial<TemplateFilter>) => {
        set(state => ({
          filter: { ...state.filter, ...filter }
        }));
      },
      
      clearFilter: () => {
        set({ filter: {}, searchTerm: '' });
      },
      
      getFilteredTemplates: () => {
        const { templates, searchTerm, filter, selectedCategory, selectedCollection, collections } = get();
        
        let filtered = templates;
        
        // 컬렉션 필터
        if (selectedCollection) {
          const collection = collections.find(c => c.id === selectedCollection);
          if (collection) {
            filtered = filtered.filter(t => collection.templates.includes(t.id));
          }
        }
        
        // 카테고리 필터
        if (selectedCategory) {
          filtered = filtered.filter(t => t.category === selectedCategory);
        }
        
        // 검색어 필터
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(t =>
            t.name.toLowerCase().includes(term) ||
            t.description.toLowerCase().includes(term) ||
            t.tags.some(tag => tag.toLowerCase().includes(term))
          );
        }
        
        // 고급 필터
        if (filter.difficulty) {
          filtered = filtered.filter(t => t.metadata.difficulty === filter.difficulty);
        }
        
        if (filter.tags && filter.tags.length > 0) {
          filtered = filtered.filter(t =>
            filter.tags!.some(tag => t.tags.includes(tag))
          );
        }
        
        if (filter.language) {
          filtered = filtered.filter(t => t.metadata.language === filter.language);
        }
        
        if (filter.rating) {
          filtered = filtered.filter(t => (t.usage.rating || 0) >= filter.rating!);
        }
        
        return filtered;
      },
      
      // 선택 관리
      selectTemplate: (template: PromptTemplate | null) => {
        set({ selectedTemplate: template });
      },
      
      selectCategory: (categoryId: string | null) => {
        set({ selectedCategory: categoryId });
      },
      
      selectCollection: (collectionId: string | null) => {
        set({ selectedCollection: collectionId });
      },
      
      // 모달 관리
      showTemplateModal: (mode: 'create' | 'edit' | 'view' | 'use', template?: PromptTemplate) => {
        set({
          templateModal: {
            isOpen: true,
            mode,
            template
          }
        });
      },
      
      hideTemplateModal: () => {
        set({
          templateModal: {
            isOpen: false,
            mode: 'view'
          }
        });
      },
      
      // 유틸리티
      refreshData: async () => {
        await Promise.all([
          get().loadTemplates(),
          get().loadCategories(),
          get().loadCollections()
        ]);
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
      
      setError: (error: string | null) => {
        set({ error });
      }
    }),
    {
      name: 'promptory-template-store',
      partialize: (state) => ({
        templates: state.templates,
        categories: state.categories,
        collections: state.collections,
        selectedCategory: state.selectedCategory,
        selectedCollection: state.selectedCollection,
        filter: state.filter
      })
    }
  )
);
