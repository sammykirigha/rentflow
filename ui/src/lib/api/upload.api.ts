import { API_BASE } from '@/constants';
import api from '.';

export const uploadImage = async (file: File): Promise<{ url: string; key: string; fullUrl: string; } | null> => {
	try {
		const response = await api.post('/storage/upload', { file }, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});
		
		if (response.data?.data && response.data?.data.key) {
			return {
				...response.data?.data,
				fullUrl: `${API_BASE}/storage/file/${response.data?.data.key}`
			};
		}

		return null;
	} catch (error) {
		console.error('Error uploading image:', (error as Error).message);
		return null;
	}
};