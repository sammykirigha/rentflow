"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { uploadImage } from '@/lib/api/upload.api';
import { Image as ImageIcon, Link, Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface ImageUploadProps {
	value?: string;
	onChange: (value: string) => void;
	label: string;
	description?: string;
	placeholder?: string;
	accept?: string;
	maxSize?: number; // in MB
}

export function ImageUpload({
	value,
	onChange,
	label,
	description,
	placeholder = "https://example.com/image.jpg",
	accept = "image/*",
	maxSize = 5, // 5MB default
}: ImageUploadProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileUpload = async (file: File) => {
		if (file.size > maxSize * 1024 * 1024) {
			toast.error(`File size should be less than ${maxSize}MB`);
			return;
		}

		setIsUploading(true);
		const formData = new FormData();
		formData.append('file', file);

		try {
			const response = await uploadImage(file);

			if (response && response.url) {
				onChange(response.fullUrl);
				toast.success('Image uploaded successfully');
			} else {
				toast.error('Failed to upload image');
			}
		} catch (error) {
			console.error('Upload error:', error);
			toast.error('Failed to upload image');
		} finally {
			setIsUploading(false);
		}
	};

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			handleFileUpload(file);
		}
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		const file = event.dataTransfer.files[0];
		if (file && file.type.startsWith('image/')) {
			handleFileUpload(file);
		}
	};

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
	};

	const removeImage = () => {
		onChange('');
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	return (
		<div className="space-y-4 w-full">
			<div className="flex items-center justify-between">
				<div className="text-sm font-medium text-gray-900">{label}</div>
				<div className="flex gap-1">
					<Button
						type="button"
						variant={inputMode === 'upload' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setInputMode('upload')}
					>
						<Upload className="w-3 h-3 mr-1" />
						Upload
					</Button>
					<Button
						type="button"
						variant={inputMode === 'url' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setInputMode('url')}
					>
						<Link className="w-3 h-3 mr-1" />
						URL
					</Button>
				</div>
			</div>

			{inputMode === 'upload' ? (
				<div className="space-y-3">
					{/* Upload Area */}
					<Card>
						<CardContent className="p-4">
							{value ? (
								<div className="space-y-3">
									<div className="relative aspect-video w-full max-w-md mx-auto rounded-lg overflow-hidden">
										<Image
											src={value?.startsWith('http') ? value : ""}
											alt="Uploaded image"
											fill
											priority
											className="object-cover"
										/>
										<Button
											type="button"
											variant="destructive"
											size="sm"
											className="absolute top-2 right-2"
											onClick={removeImage}
										>
											<X className="w-3 h-3" />
										</Button>
									</div>
									{/* <p className="text-xs text-gray-500 text-center truncate">
										{value}
									</p> */}
								</div>
							) : (
								<div
									className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
									onDrop={handleDrop}
									onDragOver={handleDragOver}
									onClick={() => fileInputRef.current?.click()}
								>
									{isUploading ? (
										<div className="flex flex-col items-center gap-2">
											<Loader2 className="w-8 h-8 animate-spin text-blue-500" />
											<p className="text-sm text-gray-600">Uploading...</p>
										</div>
									) : (
										<div className="flex flex-col items-center gap-2">
											<ImageIcon className="w-8 h-8 text-gray-400" />
											<p className="text-sm text-gray-600">
												Drop an image here or click to browse
											</p>
											<p className="text-xs text-gray-500">
												Maximum file size: {maxSize}MB
											</p>
										</div>
									)}
								</div>
							)}
						</CardContent>
					</Card>

					<input
						ref={fileInputRef}
						type="file"
						accept={accept}
						onChange={handleFileSelect}
						className="hidden"
						disabled={isUploading}
					/>
				</div>
			) : (
				<div className="space-y-3">
					<Input
						type="url"
						placeholder={placeholder}
						value={value || ''}
						onChange={(e) => onChange(e.target.value)}
					/>
					{value && (
						<div className="relative aspect-video w-full max-w-md mx-auto rounded-lg overflow-hidden">
							<Image
								src={value}
								alt="Image preview"
								fill
								className="object-cover"
								onError={() => toast.error('Failed to load image from URL')}
							/>
							<Button
								type="button"
								variant="destructive"
								size="sm"
								className="absolute top-2 right-2"
								onClick={removeImage}
							>
								<X className="w-3 h-3" />
							</Button>
						</div>
					)}
				</div>
			)}

			{description && (
				<p className="text-xs text-gray-500">{description}</p>
			)}
		</div>
	);
}