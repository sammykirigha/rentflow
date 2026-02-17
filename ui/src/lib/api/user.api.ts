import { Role } from '@/types/permissions';
import { User } from '@/types/users.d';
import api from '.';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetUsersResponse {
  data: User[];
  pagination: PaginationInfo;
}

interface GetUsersQueryDto {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}

interface UpdateUserStatusDto {
  status: string;
  reason?: string;
}

export const userApi = {
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Get all users with pagination and filters
  getUsers: async (query?: GetUsersQueryDto): Promise<GetUsersResponse> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.role && query.role !== 'all') params.append('role', query.role);
    if (query?.status && query.status !== 'all') params.append('status', query.status);
    if (query?.search) params.append('search', query.search);

    const response = await api.get(`/users?${params.toString()}`);
    return response.data;
  },

  // Update user status (suspend/reactivate)
  updateUserStatus: async (userId: string, updateData: UpdateUserStatusDto): Promise<User> => {
    const response = await api.patch(`/users/${userId}/status`, updateData);
    return response.data;
  },

  // Update user role
  updateUserRole: async (userId: string, roleId: string): Promise<User> => {
    const response = await api.patch(`/users/${userId}/role`, { roleId });
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData: { firstName?: string; lastName?: string; email?: string; phone?: string; avatarUrl?: string }): Promise<User> => {
    const response = await api.patch('/users/profile', profileData);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/users/change-password', passwordData);
    return response.data;
  },

  // Create admin/manager user
  createAdmin: async (data: { email: string; password: string; firstName?: string; lastName?: string; roleId: string }): Promise<User> => {
    const response = await api.post('/users/admins', data);
    return response.data;
  },

  // Get available roles
  getRoles: async (): Promise<Role[]> => {
    const response = await api.get('/permissions/roles');
    return response.data;
  },
};
