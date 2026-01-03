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

export interface UserDetails {
  user: User;
  stats: {
    totalPapersPurchased: number;
    totalCreditsSpent: number;
    totalCreditsEarned: number;
    currentCreditBalance: number;
    totalMpesaTransactions: number;
    totalMpesaSpent: number;
    totalReviewsWritten: number;
    totalPapersUploaded: number;
    activePapers: number;
    suspendedPapers: number;
  };
  activities: Array<{
    id: string;
    type: string;
    description: string;
    amount?: number;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }>;
}

export const userApi = {
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data?.data;
  },

  checkIfOnboarded: async (userId: string): Promise<{ isOnboarded: boolean; }> => {
    const response = await api.get(`/users/${userId}/is-onboarded`);
    return response.data?.data;
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
    return response.data?.data;
  },

  // Update user status (suspend/reactivate)
  updateUserStatus: async (userId: string, updateData: UpdateUserStatusDto): Promise<User> => {
    const response = await api.patch(`/users/${userId}/status`, updateData);
    return response.data.data;
  },

  // Get all admin users
  getAdmins: async (query?: { page?: number; limit?: number; search?: string; }): Promise<GetUsersResponse> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);

    const response = await api.get(`/users/admins?${params.toString()}`);
    return response.data?.data;
  },

  // Create new admin user
  createAdmin: async (adminData: { email: string; password: string; firstName: string; lastName: string; roleId: string; }): Promise<User> => {
    const response = await api.post('/users/admins', adminData);
    return response.data.data;
  },

  // Update user role
  updateUserRole: async (userId: string, roleId: string): Promise<User> => {
    const response = await api.patch(`/users/${userId}/role`, { roleId });
    return response.data.data;
  },

  // Get comprehensive user details
  getUserDetails: async (userId: string): Promise<UserDetails> => {
    const response = await api.get(`/users/${userId}`);
    return response.data.data;
  },

  // Update user profile
  updateProfile: async (profileData: { firstName?: string; lastName?: string; email?: string; phone?: string; avatarUrl?: string }): Promise<User> => {
    const response = await api.patch('/users/profile', profileData);
    return response.data.data;
  },

  // Change password
  changePassword: async (passwordData: { currentPassword: string; newPassword: string; }): Promise<{ success: boolean; message: string; }> => {
    const response = await api.post('/users/change-password', passwordData);
    return response.data;
  },

  // Set password (for OAuth users who don't have one)
  setPassword: async (newPassword: string): Promise<{ success: boolean; message: string; }> => {
    const response = await api.post('/auth/set-password', { newPassword });
    return response.data;
  },

  // Get auth status (has password, has google connected)
  getAuthStatus: async (): Promise<{ hasPassword: boolean; hasGoogleConnected: boolean; }> => {
    const response = await api.get('/auth/status');
    return response.data?.data;
  },

  // Connect Google account
  connectGoogle: async (providerAccountId: string, email: string): Promise<{ message: string; }> => {
    const response = await api.post('/auth/google/connect', { providerAccountId, email });
    return response.data?.data;
  },

  // Disconnect Google account
  disconnectGoogle: async (): Promise<{ message: string; }> => {
    const response = await api.delete('/auth/google/disconnect');
    return response.data?.data;
  },
};