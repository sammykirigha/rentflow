import { API_BASE } from '@/constants';
import api from '.';

export const uploadImage = async (file: File): Promise<{ url: string; key: string; fullUrl: string; } | null> => {
	try {
		const response = await api.post('/storage/upload', { file }, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});

		if (response.data && response.data.key) {
			return {
				...response.data,
				fullUrl: `${API_BASE}/storage/file/${response.data.key}`
			};
		}

		return null;
	} catch (error) {
		console.error('Error uploading image:', (error as Error).message);
		return null;
	}
};

export const getSignedUrl = async (key: string,): Promise<{ url: string } | null> => {
	try {
		const response = await api.get(`/storage/signed-url/${key}`);

		if (response.data && response.data.signedUrl) {
			return {
				url: response.data.signedUrl
			};
		}

		return null;
	} catch (error) {
		console.error('Error uploading image:', (error as Error).message);
		return null;
	}
};
