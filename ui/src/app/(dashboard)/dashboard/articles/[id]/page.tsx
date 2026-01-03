/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { TiptapEditor } from '@/components/tiptap/editor/tiptap-editor';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from '@/components/ui/button-group';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Article, ArticleStatus, articlesApi } from "@/lib/api/articles.api";
import { useQueryParams } from '@/lib/useQueryParams';

import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	ArrowLeft,
	BrainCog,
	ChevronDown,
	Copy,
	Edit,
	Loader2,
	MailCheckIcon,
	RefreshCw,
	X,
	XCircle
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from 'react-toastify';
import { EditWithAiModal } from "./components/edit-with-ai-modal";

// // Status badge component
// const StatusBadge = ({ status }: { status: ArticleStatus; }) => {
// 	const statusConfig = {
// 		[ArticleStatus.DRAFT]: {
// 			label: "Draft",
// 			className: "bg-gray-100 text-gray-800 border-gray-200",
// 			icon: FileText,
// 		},
// 		[ArticleStatus.GENERATING]: {
// 			label: "Generating",
// 			className: "bg-blue-100 text-blue-800 border-blue-200",
// 			icon: Loader2,
// 		},
// 		[ArticleStatus.GENERATED]: {
// 			label: "Generated",
// 			className: "bg-green-100 text-green-800 border-green-200",
// 			icon: CheckCircle2,
// 		},
// 		[ArticleStatus.PUBLISHED]: {
// 			label: "Published",
// 			className: "bg-purple-100 text-purple-800 border-purple-200",
// 			icon: CheckCircle2,
// 		},
// 		[ArticleStatus.FAILED]: {
// 			label: "Failed",
// 			className: "bg-red-100 text-red-800 border-red-200",
// 			icon: XCircle,
// 		},
// 	};

// 	const config = statusConfig[status] || statusConfig[ArticleStatus.DRAFT];
// 	const Icon = config.icon;

// 	return (
// 		<Badge variant="outline" className={config.className}>
// 			{status === ArticleStatus.GENERATING ? (
// 				<Loader2 className="h-3 w-3 mr-1 animate-spin" />
// 			) : (
// 				<Icon className="h-3 w-3 mr-1" />
// 			)}
// 			{config.label}
// 		</Badge>
// 	);
// };

// Format date
const formatDate = (dateString: string | null): string => {
	if (!dateString) return "—";
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

export default function ArticleViewPage() {
	const params = useParams();
	const articleId = params.id as string;

	const [article, setArticle] = useState<Article | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const [editorContent, setEditorContent] = useState<{ html: string; text: string; json: any; } | null>(null);
	const [isEditWithAiModalOpen, setIsEditWithAiModalOpen] = useState(false);

	const { setParam, getParam, removeParam } = useQueryParams();

	const editMode = getParam('edit') === 'true';

	const fetchArticle = useCallback(async (showLoader: boolean) => {
		try {
			setIsLoading(showLoader);
			setError(null);
			const data = await articlesApi.getArticle(articleId);
			setArticle(data);
		} catch (err) {
			setError("Failed to load article. Please try again.");
			console.error("Error fetching article:", err);
		} finally {
			setIsLoading(false);
		}
	}, [articleId]);

	useEffect(() => {
		if (articleId) {
			fetchArticle(true);
		}
	}, [articleId, fetchArticle]);

	// Poll for generating articles
	useEffect(() => {
		if (article?.status === ArticleStatus.GENERATING) {
			const interval = setInterval(() => fetchArticle(false), 10000);
			return () => clearInterval(interval);
		}
	}, [article?.status, fetchArticle]);

	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				horizontalRule: {},
			}),
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			TaskList,
			TaskItem.configure({ nested: true }),
			Highlight.configure({ multicolor: true }),
			Image,
			Typography,
			Superscript,
			Subscript,
		],
		content: "",
		editable: true,
		onUpdate: ({ editor }) => {
			setHasChanges(true);
			setEditorContent({
				html: editor.getHTML(),
				text: editor.getText(),
				json: editor.getJSON(),
			});
		},
	});

	useEffect(() => {
		if (editor && article?.contentJson) {
			editor.commands.setContent(article.contentJson);
			setHasChanges(false);
		} else if (editor && article?.content) {
			editor.commands.setContent(article.content);
			setHasChanges(false);
		}
	}, [editor, article]);

	// Copy to clipboard handler
	const handleCopyToClipboard = () => {
		if (article?.content && editor) {
			const markdownContent = editor.getText();
			navigator.clipboard.writeText(markdownContent)
				.then(() => {
					toast("Article content copied to clipboard!");
				})
				.catch((err) => {
					toast.error("Failed to copy content. Please try again.");
				});
		}
	};

	const handleSave = async () => {
		if (!article || !editorContent) return;

		try {
			setIsSaving(true);
			await articlesApi.updateArticle(article.articleId, {
				content: editorContent.html,
				contentJson: editorContent.json || editor?.getJSON(),
			});
			setHasChanges(false);
			fetchArticle(false);
			toast.success("Article saved successfully");
		} catch (err) {
			toast.error("Failed to save article");
			console.error("Error saving article:", err);
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<div className="h-10 w-24 animate-pulse rounded bg-gray-200" />
					<div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
				</div>
				<Card>
					<CardHeader>
						<div className="h-8 w-3/4 animate-pulse rounded bg-gray-200" />
						<div className="h-4 w-1/2 animate-pulse rounded bg-gray-200 mt-2" />
					</CardHeader>
					<CardContent>
						<div className="h-96 w-full animate-pulse rounded bg-gray-200" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error || !article) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<XCircle className="h-12 w-12 text-red-400 mb-4" />
				<p className="text-gray-600">{error || "Article not found"}</p>
				<Link href="/dashboard/articles">
					<Button variant="outline" className="mt-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Articles
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="bg-gray-100 p-4 rounded-md flex items-center justify-between">
				<div className="flex items-center gap-2 text-neutral-700 text-md">
					<Link href="/dashboard/articles" className='text-neutral-500'>
						Articles
					</Link>
					<p className='text-neutral-300'>/</p>
					<p className="line-clamp-1 font-medium">
						{article.title}
					</p>
				</div>

				{
					article?.content &&
					<div className="flex items-center gap-2">
						{
							editMode ? <>
								<Button variant="outline"
									onClick={() => removeParam('edit')}
								>
									<X className="h-4 w-4 mr-2" />
									Cancel
								</Button>

								<Button className="ml-2"
									disabled={isSaving || !hasChanges}
									onClick={handleSave}
								>Save Changes</Button>
							</> :
								<ButtonGroup>
									<ButtonGroup>
										<Button variant="outline" onClick={() => setIsEditWithAiModalOpen(true)}>
											<BrainCog className="h-4 w-4 mr-2" />
											Edit with AI
										</Button>
										<Button variant="outline"
											onClick={() => setParam('edit', 'true')}
										>
											<Edit className="h-4 w-4 mr-2" />
											Edit Manually
										</Button>
									</ButtonGroup>
									<ButtonGroup>
										<Button variant="default">Publish</Button>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="default" size="icon" aria-label="More Options" className='bg-primary/80'>
													<ChevronDown />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent>
												<DropdownMenuGroup>
													<DropdownMenuItem>
														<MailCheckIcon />
														Mark as Read
													</DropdownMenuItem>
													<DropdownMenuItem onClick={handleCopyToClipboard}>
														<Copy />
														Copy to Clipboard
													</DropdownMenuItem>
												</DropdownMenuGroup>
											</DropdownMenuContent>
										</DropdownMenu>
									</ButtonGroup>
								</ButtonGroup>}
					</div>
				}
			</div>

			<div className="space-y-6 max-w-7xl mx-auto">

				<div className="flex items-center justify-end gap-2">
					{article.status === ArticleStatus.GENERATING && (
						<Button variant="outline" size="sm" onClick={() => fetchArticle(false)}>
							<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
							Refresh
						</Button>
					)}
				</div>


				{/* Secondary Keywords */}
				{!editMode && article.secondaryKeywords && article.secondaryKeywords.length > 0 && (
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-medium">Secondary Keywords</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-2">
								{article.secondaryKeywords.map((kw) => (
									<Badge key={kw.keywordId} variant="outline">
										{kw.keyword}
									</Badge>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Article Content */}
				<Card>
					<CardContent>
						{article.status === ArticleStatus.GENERATING ? (
							<div className="flex flex-col items-center justify-center py-12">
								<Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
								<p className="text-gray-600">Generating your article...</p>
								<p className="text-sm text-gray-400 mt-1">
									This may take a few minutes
								</p>
							</div>
						) : article.status === ArticleStatus.FAILED ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<XCircle className="h-12 w-12 text-red-400 mb-4" />
								<p className="text-gray-600">Article generation failed</p>
								{article.generationError && (
									<p className="text-sm text-red-500 mt-2 max-w-md">
										{article.generationError}
									</p>
								)}
							</div>
						) :
							editMode ? (
								<div className="prose max-w-none">
									<TiptapEditor
										value={editorContent?.html || ""}
										onChange={({ html, json, text }) => {
											setEditorContent({ html, text, json });
											editor?.commands.setContent(json);
											setHasChanges(true);
										}}
										showToolbar={true}
										containerClasses="h-full"
									// className="min-h-[350px]"
									/>
								</div>
							) :
								<div className="prose max-w-none">
									<TiptapEditor
										value={editorContent?.html || ""}
										showToolbar={false}
										editable={false}
										containerClasses="h-full"
									// className="min-h-[350px]"
									/>
								</div>
						}
					</CardContent>
				</Card>

				{/* Token Usage */}
				{article.tokenUsage && (
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-medium">Token Usage Summary</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-3 gap-4 text-center">
								<div>
									<p className="text-2xl font-bold text-blue-600">
										{article.tokenUsage.inputTokens?.toLocaleString() || 0}
									</p>
									<p className="text-sm text-muted-foreground">Input Tokens</p>
								</div>
								<div>
									<p className="text-2xl font-bold text-green-600">
										{article.tokenUsage.outputTokens?.toLocaleString() || 0}
									</p>
									<p className="text-sm text-muted-foreground">Output Tokens</p>
								</div>
								<div>
									<p className="text-2xl font-bold text-purple-600">
										{article.tokenUsage.totalTokens?.toLocaleString() || 0}
									</p>
									<p className="text-sm text-muted-foreground">Total Tokens</p>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

			</div>

			{/* Edit with AI Modal */}
			<EditWithAiModal
				articleId={articleId}
				isOpen={isEditWithAiModalOpen}
				onClose={() => setIsEditWithAiModalOpen(false)}
				onSuccess={() => fetchArticle(false)}
			/>
		</div>
	);
}
