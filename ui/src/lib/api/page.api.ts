import api from './index';

// Section Types
export enum PageSectionType {
  RICH_TEXT = 'rich_text',
  GRID = 'grid',
  CHAT = 'chat',
  HERO = 'hero',
  CTA = 'cta',
  FAQ = 'faq',
  TESTIMONIALS = 'testimonials',
  FEATURES = 'features',
}

export interface GridItem {
  id: string;
  icon?: string;
  title: string;
  description: string;
}

export interface PageSection {
  id: string;
  type: PageSectionType;
  order: number;
  title?: string;
  summary?: string;
  content?: string;
  gridItems?: GridItem[];
  gridColumns?: number;
  backgroundColor?: string;
  textColor?: string;
  buttonText?: string;
  buttonLink?: string;
  imageUrl?: string;
}

// Types
export interface Page {
  id: number;
  pageId: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  sections?: PageSection[];
  featuredImage?: string;
  status: 'draft' | 'published' | 'archived';
  isActive: boolean;
  publishedAt?: string;
  views: number;
  readingTime: number;
  seoTitle?: string;
  seoDescription?: string;
  seoTags?: string[];
  seoImage?: string;
  canonicalUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePageDto {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  sections?: PageSection[];
  featuredImage?: string;
  status?: 'draft' | 'published' | 'archived';
  readingTime?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoTags?: string[];
  seoImage?: string;
  canonicalUrl?: string;
}

export interface UpdatePageDto {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  sections?: PageSection[];
  featuredImage?: string;
  status?: 'draft' | 'published' | 'archived';
  readingTime?: number;
  isActive?: boolean;
  publishedAt?: Date;
  seoTitle?: string;
  seoDescription?: string;
  seoTags?: string[];
  seoImage?: string;
  canonicalUrl?: string;
}

// Page API endpoints
export const pageApi = {
  // Get all pages
  getAll: async (published?: string): Promise<Page[]> => {
    const params = published ? `?published=${published}` : '';
    const response = await api.get(`/pages${params}`);
    return response.data?.data;
  },

  // Get page by ID
  getById: async (id: string): Promise<Page> => {
    const response = await api.get(`/pages/${id}`);
    return response.data?.data;
  },

  // Get page by slug
  getBySlug: async (slug: string): Promise<Page> => {
    const response = await api.get(`/pages/slug/${slug}`);
    return response.data?.data;
  },

  // Create page
  create: async (data: CreatePageDto): Promise<Page> => {
    const response = await api.post('/pages', data);
    return response.data?.data;
  },

  // Update page
  update: async (id: string, data: UpdatePageDto): Promise<Page> => {
    const response = await api.patch(`/pages/${id}`, data);
    return response.data?.data;
  },

  // Delete page
  delete: async (id: string): Promise<void> => {
    await api.delete(`/pages/${id}`);
  },

  // Increment views
  incrementViews: async (id: string): Promise<Page> => {
    const response = await api.patch(`/pages/${id}/views`);
    return response.data?.data;
  },
};