"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Article, ArticleStatus, articlesApi } from "@/lib/api/articles.api";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	Eye,
	FileText,
	Key,
	Loader2,
	MoreHorizontal,
	RefreshCw,
	Trash2,
	XCircle,
} from "lucide-react";
import Link from "next/link";
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

// Format word count
const formatWordCount = (count: number): string => {
	if (count >= 1000) {
		return `${(count / 1000).toFixed(1)}K`;
	}
	return count.toString();
};

// Format date
const formatDate = (dateString: string | null): string => {
	if (!dateString) return "—";
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

export default function ArticlesPage() {
	const [articles, setArticles] = useState<Article[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const fetchArticles = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			const data = await articlesApi.getArticles();
			setArticles(data || []);
		} catch (err) {
			setError("Failed to load articles. Please try again.");
			console.error("Error fetching articles:", err);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchArticles();
	}, [fetchArticles]);

	// Poll for generating articles
	useEffect(() => {
		const hasGenerating = articles.some(
			(a) => a.status === ArticleStatus.GENERATING
		);
		if (hasGenerating) {
			const interval = setInterval(fetchArticles, 5000);
			return () => clearInterval(interval);
		}
	}, [articles, fetchArticles]);

	const handleDeleteClick = (article: Article) => {
		setArticleToDelete(article);
		setIsDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!articleToDelete) return;

		try {
			setDeletingId(articleToDelete.articleId);
			await articlesApi.deleteArticle(articleToDelete.articleId);
			setArticles((prev) =>
				prev.filter((a) => a.articleId !== articleToDelete.articleId)
			);
			toast.success("Article deleted successfully");
		} catch (err) {
			toast.error("Failed to delete article");
			console.error("Error deleting article:", err);
		} finally {
			setDeletingId(null);
			setIsDeleteDialogOpen(false);
			setArticleToDelete(null);
		}
	};

	// Calculate stats
	const stats = {
		total: articles.length,
		generated: articles.filter((a) => a.status === ArticleStatus.GENERATED).length,
		generating: articles.filter((a) => a.status === ArticleStatus.GENERATING).length,
		totalWords: articles.reduce((sum, a) => sum + (a.wordCount || 0), 0),
	};

	return (
		<TooltipProvider>
			<div className="space-y-6">
				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">Total Articles</p>
									<p className="text-2xl font-bold">{stats.total}</p>
								</div>
								<FileText className="h-8 w-8 text-muted-foreground" />
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">Generated</p>
									<p className="text-2xl font-bold text-green-600">{stats.generated}</p>
								</div>
								<CheckCircle2 className="h-8 w-8 text-green-500" />
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">Generating</p>
									<p className="text-2xl font-bold text-blue-600">{stats.generating}</p>
								</div>
								<Loader2 className={`h-8 w-8 text-blue-500 ${stats.generating > 0 ? "animate-spin" : ""}`} />
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">Total Words</p>
									<p className="text-2xl font-bold text-purple-600">
										{formatWordCount(stats.totalWords)}
									</p>
								</div>
								<Key className="h-8 w-8 text-purple-500" />
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Articles Table */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<FileText className="h-5 w-5" />
									Articles
								</CardTitle>
								<CardDescription>
									Manage your generated articles
								</CardDescription>
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={fetchArticles}
									disabled={isLoading}
								>
									<RefreshCw
										className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
									/>
									Refresh
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
							</div>
						) : error ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<AlertCircle className="h-12 w-12 text-red-400 mb-4" />
								<p className="text-gray-600">{error}</p>
								<Button variant="outline" className="mt-4" onClick={fetchArticles}>
									Try Again
								</Button>
							</div>
						) : articles.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<FileText className="h-12 w-12 text-gray-300 mb-4" />
								<p className="text-gray-600">No articles found</p>
								<p className="text-sm text-gray-400 mt-1">
									Generate articles from your keywords to get started
								</p>
								<Link href="/dashboard/keywords">
									<Button className="mt-4">
										<Key className="h-4 w-4 mr-2" />
										Go to Keywords
									</Button>
								</Link>
							</div>
						) : (
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Title</TableHead>
											<TableHead>Keyword</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Words</TableHead>
											<TableHead>Generated</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{articles.map((article) => (
											<TableRow key={article.articleId}>
												<TableCell className="font-medium max-w-xs">
													<Tooltip>
														<TooltipTrigger className="text-left truncate block">
															{article.title}
														</TooltipTrigger>
														<TooltipContent className="max-w-sm">
															<p>{article.title}</p>
														</TooltipContent>
													</Tooltip>
												</TableCell>
												<TableCell>
													{article.primaryKeyword ? (
														<Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
															<Key className="h-3 w-3 mr-1" />
															{article.primaryKeyword.keyword}
														</Badge>
													) : (
														<span className="text-muted-foreground text-sm">—</span>
													)}
												</TableCell>
												<TableCell>
													<StatusBadge status={article.status} />
												</TableCell>
												<TableCell>
													<span className="font-mono">
														{article.wordCount > 0 ? formatWordCount(article.wordCount) : "—"}
													</span>
												</TableCell>
												<TableCell>
													<span className="text-sm text-muted-foreground flex items-center gap-1">
														<Clock className="h-3 w-3" />
														{formatDate(article.generatedAt)}
													</span>
												</TableCell>
												<TableCell className="text-right">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant="ghost" size="sm">
																<MoreHorizontal className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<Link href={`/dashboard/articles/${article.articleId}`}>
																<DropdownMenuItem>
																	<Eye className="h-4 w-4 mr-2" />
																	View Article
																</DropdownMenuItem>
															</Link>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																onClick={() => handleDeleteClick(article)}
																className="text-red-600"
																disabled={deletingId === article.articleId}
															>
																{deletingId === article.articleId ? (
																	<Loader2 className="h-4 w-4 mr-2 animate-spin" />
																) : (
																	<Trash2 className="h-4 w-4 mr-2" />
																)}
																Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Delete Confirmation Dialog */}
				<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete Article</AlertDialogTitle>
							<AlertDialogDescription>
								Are you sure you want to delete this article? This action cannot
								be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleConfirmDelete}
								className="bg-red-600 hover:bg-red-700"
								disabled={!!deletingId}
							>
								{deletingId ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Deleting...
									</>
								) : (
									"Delete"
								)}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</TooltipProvider>
	);
}
