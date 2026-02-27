import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window === 'undefined') return config;

    const token = sessionStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to unwrap the API's TransformInterceptor wrapper
// API responses come as { success, data, statusCode, timestamp }
// This extracts the inner `data` so callers get the actual payload directly
// Only unwrap when both `success` and `data` keys are present (TransformInterceptor format)
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (typeof window === 'undefined') return Promise.reject(error);

    if (error.response?.status === 401) {
      const token = sessionStorage.getItem('access_token');
      if (token) {
        // Token exists but server rejected it (expired or invalid) — clear it
        sessionStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      // If no token, the request was made during logout — suppress the error
    }

    return Promise.reject(error);
  }
);

export default api;