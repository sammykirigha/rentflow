import api from './index';

// Types
export interface Subject {
  id: number;
  subjectId: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  parentSubjectId?: number;
  aiPrompt?: string;
  useLatex?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoTags?: string[];
  seoImage?: string;
  canonicalUrl?: string;
  createdAt: string;
  updatedAt: string;
  subSubjects?: Subject[];
  parentSubject?: Subject;
}

export interface CreateSubjectDto {
  name: string;
  slug?: string;
  description?: string;
  parentSubjectId?: number;
  aiPrompt?: string;
  useLatex?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoTags?: string[];
  seoImage?: string;
  canonicalUrl?: string;
}

export interface UpdateSubjectDto {
  name?: string;
  slug?: string;
  description?: string;
  parentSubjectId?: number;
  isActive?: boolean;
  aiPrompt?: string;
  useLatex?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoTags?: string[];
  seoImage?: string;
  canonicalUrl?: string;
}

// API endpoints
export const subjectApi = {
  // Get all subjects
  getAll: async (parentId?: number, onlyActive?: boolean): Promise<Subject[]> => {
    const params = new URLSearchParams();
    if (parentId !== undefined) {
      params.append('parentId', parentId.toString());
    }
    if (onlyActive !== undefined) {
      params.append('onlyActive', onlyActive.toString());
    }
    const response = await api.get(`/subjects?${params.toString()}`);
    return response.data?.data;
  },

  // Get hierarchical subjects (main subjects with children)
  getHierarchical: async (onlyActive?: boolean): Promise<Subject[]> => {
    const params = new URLSearchParams();
    if (onlyActive !== undefined) {
      params.append('onlyActive', onlyActive.toString());
    }
    const response = await api.get(`/subjects/hierarchical?${params.toString()}`);
    return response.data?.data;
  },

  // Get subject by ID
  getById: async (id: string): Promise<Subject> => {
    const response = await api.get(`/subjects/${id}`);
    return response.data?.data;
  },

  // Get subject by slug
  getBySlug: async (slug: string): Promise<Subject> => {
    const response = await api.get(`/subjects/slug/${slug}`);
    return response.data?.data;
  },

  // Create subject
  create: async (data: CreateSubjectDto): Promise<Subject> => {
    const response = await api.post('/subjects', data);
    return response.data?.data;
  },

  // Update subject
  update: async (id: string, data: UpdateSubjectDto): Promise<Subject> => {
    const response = await api.patch(`/subjects/${id}`, data);
    return response.data?.data;
  },

  // Delete subject
  delete: async (id: string): Promise<void> => {
    await api.delete(`/subjects/${id}`);
  },
};
