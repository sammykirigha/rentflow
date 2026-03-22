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

/**
 * Upload a file directly to S3 via presigned URL.
 * Flow: API gives us a presigned PUT URL → browser uploads straight to S3.
 * Much faster than routing the file through the API server.
 */
export const uploadFileDirect = async (file: File): Promise<{ key: string; fullUrl: string } | null> => {
	try {
		// 1. Get presigned upload URL from our API
		const response = await api.post('/storage/presigned-upload', {
			filename: file.name,
			contentType: file.type,
		});

		const { key, uploadUrl } = response.data;
		if (!key || !uploadUrl) return null;

		// 2. PUT file directly to S3
		await fetch(uploadUrl, {
			method: 'PUT',
			body: file,
			headers: {
				'Content-Type': file.type,
			},
		});

		return {
			key,
			fullUrl: `${API_BASE}/storage/file/${key}`,
		};
	} catch (error) {
		console.error('Error uploading file:', (error as Error).message);
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
