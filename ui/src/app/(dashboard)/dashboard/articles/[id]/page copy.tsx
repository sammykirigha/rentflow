"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Article, ArticleStatus, articlesApi } from "@/lib/api/articles.api";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	ArrowLeft,
	Bot,
	Calendar,
	CheckCircle2,
	Clock,
	FileText,
	Key,
	Loader2,
	RefreshCw,
	Save,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// Status badge component
const StatusBadge = ({ status }: { status: ArticleStatus; }) => {
	const statusConfig = {
		[ArticleStatus.DRAFT]: {
			label: "Draft",
			className: "bg-gray-100 text-gray-800 border-gray-200",
			icon: FileText,
		},
		[ArticleStatus.GENERATING]: {
			label: "Generating",
			className: "bg-blue-100 text-blue-800 border-blue-200",
			icon: Loader2,
		},
		[ArticleStatus.GENERATED]: {
			label: "Generated",
			className: "bg-green-100 text-green-800 border-green-200",
			icon: CheckCircle2,
		},
		[ArticleStatus.PUBLISHED]: {
			label: "Published",
			className: "bg-purple-100 text-purple-800 border-purple-200",
			icon: CheckCircle2,
		},
		[ArticleStatus.FAILED]: {
			label: "Failed",
			className: "bg-red-100 text-red-800 border-red-200",
			icon: XCircle,
		},
	};

	const config = statusConfig[status] || statusConfig[ArticleStatus.DRAFT];
	const Icon = config.icon;

	return (
		<Badge variant="outline" className={config.className}>
			{status === ArticleStatus.GENERATING ? (
				<Loader2 className="h-3 w-3 mr-1 animate-spin" />
			) : (
				<Icon className="h-3 w-3 mr-1" />
			)}
			{config.label}
		</Badge>
	);
};

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
	const [editorContent, setEditorContent] = useState<{ html: string; text: string; } | null>(null);

	const fetchArticle = useCallback(async () => {
		try {
			setIsLoading(true);
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
			fetchArticle();
		}
	}, [articleId, fetchArticle]);

	// Poll for generating articles
	useEffect(() => {
		if (article?.status === ArticleStatus.GENERATING) {
			const interval = setInterval(fetchArticle, 5000);
			return () => clearInterval(interval);
		}
	}, [article?.status, fetchArticle]);

	// TipTap editor for viewing/editing
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
		editable: false,
		onUpdate: ({ editor }) => {
			setHasChanges(true);
			setEditorContent({
				html: editor.getHTML(),
				text: editor.getText(),
			});
		},
	});

	console.log({ article });

	// Update editor when article loads
	useEffect(() => {
		if (editor && article?.contentJson) {
			editor.commands.setContent(article.contentJson);
			setHasChanges(false);
		} else if (editor && article?.content) {
			editor.commands.setContent(article.content);
			setHasChanges(false);
		}
	}, [editor, article]);

	const handleSave = async () => {
		if (!article || !editorContent) return;

		try {
			setIsSaving(true);
			await articlesApi.updateArticle(article.articleId, {
				content: editorContent.html,
				contentJson: editor?.getJSON(),
			});
			setHasChanges(false);
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
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link href="/dashboard/articles">
						<Button variant="outline" size="sm">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back
						</Button>
					</Link>
					<div>
						<h1 className="text-2xl font-bold text-gray-900 line-clamp-1">
							{article.title}
						</h1>
						<div className="flex items-center gap-3 mt-1">
							<StatusBadge status={article.status} />
							{article.primaryKeyword && (
								<Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
									<Key className="h-3 w-3 mr-1" />
									{article.primaryKeyword.keyword}
								</Badge>
							)}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{article.status === ArticleStatus.GENERATING && (
						<Button variant="outline" size="sm" onClick={fetchArticle}>
							<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
							Refresh
						</Button>
					)}
					{hasChanges && (
						<Button onClick={handleSave} disabled={isSaving}>
							{isSaving ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : (
								<Save className="h-4 w-4 mr-2" />
							)}
							Save Changes
						</Button>
					)}
				</div>
			</div>

			{/* Article Info Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<FileText className="h-5 w-5 text-muted-foreground" />
							<div>
								<p className="text-sm text-muted-foreground">Word Count</p>
								<p className="text-lg font-semibold">{article.wordCount.toLocaleString()}</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<Bot className="h-5 w-5 text-muted-foreground" />
							<div>
								<p className="text-sm text-muted-foreground">AI Model</p>
								<p className="text-lg font-semibold">
									{article.aiModel?.displayName || "Default"}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<Calendar className="h-5 w-5 text-muted-foreground" />
							<div>
								<p className="text-sm text-muted-foreground">Created</p>
								<p className="text-sm font-semibold">
									{formatDate(article.createdAt)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<Clock className="h-5 w-5 text-muted-foreground" />
							<div>
								<p className="text-sm text-muted-foreground">Generated</p>
								<p className="text-sm font-semibold">
									{formatDate(article.generatedAt)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Secondary Keywords */}
			{article.secondaryKeywords && article.secondaryKeywords.length > 0 && (
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
				<CardHeader>
					<CardTitle>Article Content</CardTitle>
					<CardDescription>
						{article.status === ArticleStatus.GENERATING
							? "Article is being generated. Please wait..."
							: "View and edit your article content below"}
					</CardDescription>
				</CardHeader>
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
					) : (
						<div className="prose max-w-none">
							<EditorContent
								editor={editor}
								readOnly
								disabled
								className="min-h-96 border rounded-lg p-4 focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2"
							/>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Token Usage */}
			{article.tokenUsage && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium">Token Usage</CardTitle>
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
	);
}
