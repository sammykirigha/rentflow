import { API_BASE } from '@/constants';

export const getFileUrl = (key: string) => {
  return `${API_BASE}/storage/file/${key}`;
};
