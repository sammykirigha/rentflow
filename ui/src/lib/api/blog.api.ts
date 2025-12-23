import api from './index';

// Types
export interface BlogCategory {
  id: number;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  blogs?: Blog[];
}

export interface Blog {
  id: number;
  blogId: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  isActive: boolean;
  publishedAt?: string;
  scheduledAt?: string;
  categoryId?: number;
  views: number;
  likes: number;
  readingTime: number;
  seoTitle?: string;
  seoDescription?: string;
  seoTags?: string[];
  seoImage?: string;
  canonicalUrl?: string;
  createdAt: string;
  updatedAt: string;
  category?: BlogCategory;
}

export interface CreateBlogDto {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  status?: 'draft' | 'published' | 'scheduled' | 'archived';
  scheduledAt?: string;
  categoryId?: number;
  readingTime?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoTags?: string[];
  seoImage?: string;
  canonicalUrl?: string;
}

export interface UpdateBlogDto {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string;
  status?: 'draft' | 'published' | 'scheduled' | 'archived';
  scheduledAt?: string;
  categoryId?: number;
  readingTime?: number;
  isActive?: boolean;
  publishedAt?: Date;
  seoTitle?: string;
  seoDescription?: string;
  seoTags?: string[];
  seoImage?: string;
  canonicalUrl?: string;
}

export interface CreateBlogCategoryDto {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
}

export interface UpdateBlogCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

// Blog API endpoints
export const blogApi = {
  // Get all blogs
  getAll: async (published?: string): Promise<Blog[]> => {
    const params = published ? `?published=${published}` : '';
    const response = await api.get(`/blogs${params}`);
    return response.data?.data;
  },

  // Get blog by ID
  getById: async (id: string): Promise<Blog> => {
    const response = await api.get(`/blogs/${id}`);
    return response.data?.data;
  },

  // Get blog by slug
  getBySlug: async (slug: string): Promise<Blog> => {
    const response = await api.get(`/blogs/slug/${slug}`);
    return response.data?.data;
  },

  // Create blog
  create: async (data: CreateBlogDto): Promise<Blog> => {
    const response = await api.post('/blogs', data);
    return response.data?.data;
  },

  // Update blog
  update: async (id: string, data: UpdateBlogDto): Promise<Blog> => {
    const response = await api.patch(`/blogs/${id}`, data);
    return response.data?.data;
  },

  // Delete blog
  delete: async (id: string): Promise<void> => {
    await api.delete(`/blogs/${id}`);
  },

  // Increment views
  incrementViews: async (id: string): Promise<Blog> => {
    const response = await api.patch(`/blogs/${id}/views`);
    return response.data?.data;
  },

  // Increment likes
  incrementLikes: async (id: string): Promise<Blog> => {
    const response = await api.patch(`/blogs/${id}/likes`);
    return response.data?.data;
  },

  // Publish scheduled blogs
  publishScheduled: async (): Promise<void> => {
    await api.post('/blogs/publish-scheduled');
  },
};

// Blog Category API endpoints
export const blogCategoryApi = {
  // Get all categories
  getAll: async (active?: string): Promise<BlogCategory[]> => {
    const params = active ? `?active=${active}` : '';
    const response = await api.get(`/blog-categories${params}`);
    return response.data?.data;
  },

  // Get category by ID
  getById: async (id: string): Promise<BlogCategory> => {
    const response = await api.get(`/blog-categories/${id}`);
    return response.data?.data;
  },

  // Get category by slug
  getBySlug: async (slug: string): Promise<BlogCategory> => {
    const response = await api.get(`/blog-categories/slug/${slug}`);
    return response.data?.data;
  },

  // Create category
  create: async (data: CreateBlogCategoryDto): Promise<BlogCategory> => {
    const response = await api.post('/blog-categories', data);
    return response.data?.data;
  },

  // Update category
  update: async (id: string, data: UpdateBlogCategoryDto): Promise<BlogCategory> => {
    const response = await api.patch(`/blog-categories/${id}`, data);
    return response.data?.data;
  },

  // Delete category
  delete: async (id: string): Promise<void> => {
    await api.delete(`/blog-categories/${id}`);
  },
};