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
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
import { Article, articlesApi } from "@/lib/api/articles.api";
import { Keyword, keywordsApi } from "@/lib/api/keywords.api";
import {
	AlertCircle,
	ArrowDown,
	ArrowUp,
	Check,
	Crown,
	FileText,
	Filter,
	Key,
	Link2,
	Loader2,
	MoreHorizontal,
	Plus,
	RefreshCw,
	Sparkles,
	Target,
	Trash2,
	TrendingUp,
	Unlink
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import AddKeywordsModal from "./components/add-keywords-modal";
import GenerateArticleModal from "./components/generate-article-modal";

// Difficulty badge component - shows score with yellow-to-red gradient
const DifficultyBadge = ({ difficulty }: { difficulty: number; }) => {
	// Interpolate from yellow (0) to red (100)
	const getGradientColor = (score: number) => {
		const clampedScore = Math.max(0, Math.min(100, score));
		// Yellow: hsl(45, 100%, 51%) -> Red: hsl(0, 100%, 50%)
		const hue = 45 - (clampedScore / 100) * 45; // 45 (yellow) to 0 (red)
		return {
			background: `hsl(${hue}, 100%, 90%)`,
			color: `hsl(${hue}, 100%, 30%)`,
			borderColor: `hsl(${hue}, 100%, 70%)`,
		};
	};

	const getLabel = (score: number) => {
		if (score <= 30) return "Easy";
		if (score <= 60) return "Medium";
		if (score <= 80) return "Hard";
		return "Very Hard";
	};

	const colors = getGradientColor(difficulty);

	return (
		<Badge
			variant="outline"
			style={{
				backgroundColor: colors.background,
				color: colors.color,
				borderColor: colors.borderColor,
			}}
		>
			{difficulty} - {getLabel(difficulty)}
		</Badge>
	);
};

// Format volume with K/M suffix
const formatVolume = (volume: number): string => {
	if (volume >= 1000000) {
		return `${(volume / 1000000).toFixed(1)}M`;
	}
	if (volume >= 1000) {
		return `${(volume / 1000).toFixed(1)}K`;
	}
	return volume.toString();
};

// Primary/Secondary badge component
const TypeBadge = ({ isPrimary }: { isPrimary: boolean; }) => {
	return isPrimary ? (
		<Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100">
			<Crown className="h-3 w-3 mr-1" />
			Primary
		</Badge>
	) : (
		<Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
			Secondary
		</Badge>
	);
};

export default function KeywordsPage() {
	const router = useRouter();
	const [keywords, setKeywords] = useState<Keyword[]>([]);
	const [keywordArticles, setKeywordArticles] = useState<Map<string, Article>>(new Map());
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
	const [selectedKeywordForArticle, setSelectedKeywordForArticle] = useState<Keyword | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [keywordToDelete, setKeywordToDelete] = useState<Keyword | null>(null);
	const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
	const [isUpdatingMultiplePrimary, setIsUpdatingMultiplePrimary] = useState(false);
	const [isUpdatingMultipleParent, setIsUpdatingMultipleParent] = useState(false);
	const [togglingPrimaryId, setTogglingPrimaryId] = useState<string | null>(null);
	const [updatingParentId, setUpdatingParentId] = useState<string | null>(null);
	const [typeFilter, setTypeFilter] = useState<"all" | "primary" | "secondary">("all");
	const [sortColumn, setSortColumn] = useState<string>("volume");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [isDeleteMultipleDialogOpen, setIsDeleteMultipleDialogOpen] = useState(false);

	// Get primary keywords for parent selection
	const primaryKeywords = keywords.filter((k) => k.isPrimary);

	const allSelectedAreSecondary = selectedIds.size > 0 &&
		Array.from(selectedIds).every((id) => {
			const keyword = keywords.find((k) => k.keywordId === id);
			return keyword && !keyword.isPrimary;
		});

	const filteredKeywords = keywords.filter((k) => {
		if (typeFilter === "all") return true;
		if (typeFilter === "primary") return k.isPrimary;
		if (typeFilter === "secondary") return !k.isPrimary;
		return true;
	});

	// Sort filtered keywords
	const sortedKeywords = [...filteredKeywords].sort((a, b) => {
		let aValue: string | number | boolean = "";
		let bValue: string | number | boolean = "";

		switch (sortColumn) {
			case "keyword":
				aValue = a.keyword.toLowerCase();
				bValue = b.keyword.toLowerCase();
				break;
			case "difficulty":
				aValue = a.difficulty;
				bValue = b.difficulty;
				break;
			case "volume":
				aValue = a.volume;
				bValue = b.volume;
				break;
			case "type":
				aValue = a.isPrimary ? 1 : 0;
				bValue = b.isPrimary ? 1 : 0;
				break;
			case "status":
				aValue = a.isAnalyzed ? 1 : 0;
				bValue = b.isAnalyzed ? 1 : 0;
				break;
			case "recommendedTitle":
				aValue = (a.recommendedTitle || "").toLowerCase();
				bValue = (b.recommendedTitle || "").toLowerCase();
				break;
			case "parent":
				const getParentKeyword = (parentId: string | null) => {
					if (!parentId) return "";
					return keywords.find(k => k.keywordId === parentId)?.keyword?.toLowerCase() || "";
				};
				aValue = getParentKeyword(a.parentKeywordId);
				bValue = getParentKeyword(b.parentKeywordId);
				break;
			default:
				return 0;
		}

		if (aValue < bValue) {
			return sortDirection === "asc" ? -1 : 1;
		}
		if (aValue > bValue) {
			return sortDirection === "asc" ? 1 : -1;
		}
		return 0;
	});

	// Handle sort column click
	const handleSortClick = (column: string) => {
		if (sortColumn === column) {
			// Toggle direction if same column
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			// Set new column with desc as default
			setSortColumn(column);
			setSortDirection("desc");
		}
	};

	const fetchKeywords = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			const data = await keywordsApi.getKeywords();
			setKeywords(data || []);

			// Fetch articles for primary keywords
			const articles = await articlesApi.getArticles();
			const articleMap = new Map<string, Article>();
			articles.forEach((article) => {
				articleMap.set(article.primaryKeywordId, article);
			});
			setKeywordArticles(articleMap);
		} catch (err) {
			setError("Failed to load keywords. Please try again.");
			console.error("Error fetching keywords:", err);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchKeywords();
	}, [fetchKeywords]);

	// Get secondary keywords for a primary keyword
	const getSecondaryKeywordsForPrimary = (primaryKeywordId: string) => {
		return keywords.filter((k) => k.parentKeywordId === primaryKeywordId);
	};

	// Handle Generate Article click
	const handleGenerateArticleClick = (keyword: Keyword) => {
		setSelectedKeywordForArticle(keyword);
		setIsGenerateModalOpen(true);
	};

	// Handle Read Article click
	const handleReadArticleClick = (keyword: Keyword) => {
		const article = keywordArticles.get(keyword.keywordId);
		if (article) {
			router.push(`/dashboard/articles/${article.articleId}`);
		}
	};

	// Handle Article Generation Success
	const handleArticleGenerationSuccess = (article: Article) => {
		setKeywordArticles((prev) => new Map(prev).set(article.primaryKeywordId, article));
	};

	const handleReanalyze = async (keyword: Keyword) => {
		try {
			setReanalyzingId(keyword.keywordId);
			const updated = await keywordsApi.reanalyzeKeyword(keyword.keywordId);
			setKeywords((prev) =>
				prev.map((k) => (k.keywordId === keyword.keywordId ? updated : k))
			);
			toast.success("Keyword reanalyzed successfully");
		} catch (err) {
			toast.error("Failed to reanalyze keyword");
			console.error("Error reanalyzing keyword:", err);
		} finally {
			setReanalyzingId(null);
		}
	};

	const handleTogglePrimary = async (keyword: Keyword) => {
		try {
			setTogglingPrimaryId(keyword.keywordId);
			const updated = await keywordsApi.updatePrimaryStatus(keyword.keywordId, !keyword.isPrimary);
			setKeywords((prev) =>
				prev.map((k) => (k.keywordId === keyword.keywordId ? updated : k))
			);
			toast.success(
				updated.isPrimary
					? "Keyword set as Primary - title will be generated"
					: "Keyword set as Secondary"
			);
		} catch (err) {
			toast.error("Failed to update keyword type");
			console.error("Error updating keyword type:", err);
		} finally {
			setTogglingPrimaryId(null);
		}
	};

	const handleUpdateParentKeyword = async (keyword: Keyword, parentKeywordId: string | null) => {
		try {
			setUpdatingParentId(keyword.keywordId);
			const updated = await keywordsApi.updateParentKeyword(keyword.keywordId, parentKeywordId);
			setKeywords((prev) =>
				prev.map((k) => (k.keywordId === keyword.keywordId ? updated : k))
			);
			if (parentKeywordId) {
				const parentKeyword = keywords.find(k => k.keywordId === parentKeywordId);
				toast.success(`Assigned to "${parentKeyword?.keyword}"`);
			} else {
				toast.success("Parent keyword removed");
			}
		} catch (err) {
			toast.error("Failed to update parent keyword");
			console.error("Error updating parent keyword:", err);
		} finally {
			setUpdatingParentId(null);
		}
	};

	const handleDeleteClick = (keyword: Keyword) => {
		setKeywordToDelete(keyword);
		setIsDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!keywordToDelete) return;

		try {
			setDeletingId(keywordToDelete.keywordId);
			await keywordsApi.deleteKeyword(keywordToDelete.keywordId);
			setKeywords((prev) =>
				prev.filter((k) => k.keywordId !== keywordToDelete.keywordId)
			);
			toast.success("Keyword deleted successfully");
		} catch (err) {
			toast.error("Failed to delete keyword");
			console.error("Error deleting keyword:", err);
		} finally {
			setDeletingId(null);
			setIsDeleteDialogOpen(false);
			setKeywordToDelete(null);
		}
	};

	const handleSelectOne = (keywordId: string, checked: boolean) => {
		const newSelected = new Set(selectedIds);
		if (checked) {
			newSelected.add(keywordId);
		} else {
			newSelected.delete(keywordId);
		}
		setSelectedIds(newSelected);
	};

	const handleDeleteSelectedClick = () => {
		if (selectedIds.size === 0) return;
		setIsDeleteMultipleDialogOpen(true);
	};

	const handleDeleteSelected = async () => {
		if (selectedIds.size === 0) return;

		try {
			setIsDeletingMultiple(true);
			const count = selectedIds.size;
			await keywordsApi.deleteMultipleKeywords(Array.from(selectedIds));
			setKeywords((prev) =>
				prev.filter((k) => !selectedIds.has(k.keywordId))
			);
			setSelectedIds(new Set());
			toast.success(`${count} keyword${count > 1 ? "s" : ""} deleted successfully`);
		} catch (err) {
			toast.error("Failed to delete keywords");
			console.error("Error deleting keywords:", err);
		} finally {
			setIsDeletingMultiple(false);
			setIsDeleteMultipleDialogOpen(false);
		}
	};

	const handleBulkSetPrimary = async (isPrimary: boolean) => {
		if (selectedIds.size === 0) return;

		try {
			setIsUpdatingMultiplePrimary(true);
			const updatedKeywords = await keywordsApi.bulkUpdatePrimaryStatus(
				Array.from(selectedIds),
				isPrimary
			);
			setKeywords((prev) =>
				prev.map((k) => {
					const updated = updatedKeywords.find((u) => u.keywordId === k.keywordId);
					return updated || k;
				})
			);
			setSelectedIds(new Set());
			toast.success(
				`${selectedIds.size} keyword${selectedIds.size > 1 ? "s" : ""} set as ${isPrimary ? "Primary" : "Secondary"}`
			);
		} catch (err) {
			toast.error("Failed to update keywords");
			console.error("Error updating keywords:", err);
		} finally {
			setIsUpdatingMultiplePrimary(false);
		}
	};

	const handleBulkSetParent = async (parentKeywordId: string | null) => {
		if (selectedIds.size === 0) return;

		try {
			setIsUpdatingMultipleParent(true);
			const updatedKeywords = await keywordsApi.bulkUpdateParentKeyword(
				Array.from(selectedIds),
				parentKeywordId
			);
			setKeywords((prev) =>
				prev.map((k) => {
					const updated = updatedKeywords.find((u) => u.keywordId === k.keywordId);
					return updated || k;
				})
			);
			setSelectedIds(new Set());
			if (parentKeywordId) {
				const parentKeyword = keywords.find((k) => k.keywordId === parentKeywordId);
				toast.success(
					`${selectedIds.size} keyword${selectedIds.size > 1 ? "s" : ""} assigned to "${parentKeyword?.keyword}"`
				);
			} else {
				toast.success(
					`Parent removed from ${selectedIds.size} keyword${selectedIds.size > 1 ? "s" : ""}`
				);
			}
		} catch (err) {
			toast.error("Failed to update parent keyword");
			console.error("Error updating parent keyword:", err);
		} finally {
			setIsUpdatingMultipleParent(false);
		}
	};

	// Calculate stats
	const stats = {
		total: keywords.length,
		primaryKeywords: keywords.filter((k) => k.isPrimary).length,
		easyKeywords: keywords.filter((k) => k.difficulty <= 30).length,
		highVolume: keywords.filter((k) => k.volume >= 1000).length,
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
									<p className="text-sm text-muted-foreground">Total Keywords</p>
									<p className="text-2xl font-bold">{stats.total}</p>
								</div>
								<Key className="h-8 w-8 text-muted-foreground" />
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">Primary Keywords</p>
									<p className="text-2xl font-bold text-purple-600">{stats.primaryKeywords}</p>
								</div>
								<Crown className="h-8 w-8 text-purple-500" />
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">Easy Keywords (≤30)</p>
									<p className="text-2xl font-bold text-green-600">{stats.easyKeywords}</p>
								</div>
								<Target className="h-8 w-8 text-green-500" />
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">High Volume (1K+)</p>
									<p className="text-2xl font-bold text-blue-600">{stats.highVolume}</p>
								</div>
								<TrendingUp className="h-8 w-8 text-blue-500" />
							</div>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Key className="h-5 w-5" />
									Keywords
								</CardTitle>
								<CardDescription>
									Manage and analyze your SEO keywords
								</CardDescription>
							</div>
							<div className="flex items-center gap-2">
								{/* Type Filter */}
								<Select value={typeFilter} onValueChange={(value: "all" | "primary" | "secondary") => setTypeFilter(value)}>
									<SelectTrigger className="min-w-35 h-9">
										<Filter className="h-4 w-4 mr-2" />
										<SelectValue placeholder="Filter by type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Types</SelectItem>
										<SelectItem value="primary">
											<div className="flex items-center gap-2">
												<Crown className="h-3 w-3 text-purple-600" />
												Primary
											</div>
										</SelectItem>
										<SelectItem value="secondary">Secondary</SelectItem>
									</SelectContent>
								</Select>
								{selectedIds.size > 0 && (
									<>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleBulkSetPrimary(true)}
											disabled={isUpdatingMultiplePrimary}
										>
											{isUpdatingMultiplePrimary ? (
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											) : (
												<Crown className="h-4 w-4 mr-2 text-purple-600" />
											)}
											Set Primary
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleBulkSetPrimary(false)}
											disabled={isUpdatingMultiplePrimary}
										>
											{isUpdatingMultiplePrimary ? (
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											) : null}
											Set Secondary
										</Button>
										{allSelectedAreSecondary && primaryKeywords.length > 0 && (
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="outline"
														size="sm"
														disabled={isUpdatingMultipleParent}
													>
														{isUpdatingMultipleParent ? (
															<Loader2 className="h-4 w-4 mr-2 animate-spin" />
														) : (
															<Link2 className="h-4 w-4 mr-2 text-blue-600" />
														)}
														Assign Parent
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
													<DropdownMenuItem
														onClick={() => handleBulkSetParent(null)}
													>
														<Unlink className="h-4 w-4 mr-2" />
														Remove Parent
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													{primaryKeywords.map((primary) => (
														<DropdownMenuItem
															key={primary.keywordId}
															onClick={() => handleBulkSetParent(primary.keywordId)}
														>
															<Crown className="h-4 w-4 mr-2 text-purple-600" />
															{primary.keyword}
														</DropdownMenuItem>
													))}
												</DropdownMenuContent>
											</DropdownMenu>
										)}
										<Button
											variant="destructive"
											size="sm"
											onClick={handleDeleteSelectedClick}
											disabled={isDeletingMultiple}
										>
											{isDeletingMultiple ? (
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											) : (
												<Trash2 className="h-4 w-4 mr-2" />
											)}
											Delete ({selectedIds.size})
										</Button>
									</>
								)}
								<Button
									variant="outline"
									size="sm"
									onClick={fetchKeywords}
									disabled={isLoading}
								>
									<RefreshCw
										className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
									/>
									Refresh
								</Button>
								<Button size="sm" onClick={() => setIsAddModalOpen(true)}>
									<Plus className="h-4 w-4 mr-2" />
									Add Keywords
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
								<Button variant="outline" className="mt-4" onClick={fetchKeywords}>
									Try Again
								</Button>
							</div>
						) : keywords.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<Key className="h-12 w-12 text-gray-300 mb-4" />
								<p className="text-gray-600">No keywords found</p>
								<p className="text-sm text-gray-400 mt-1">
									Click &quot;Add Keywords&quot; to get started
								</p>
								<Button className="mt-4" onClick={() => setIsAddModalOpen(true)}>
									<Plus className="h-4 w-4 mr-2" />
									Add Keywords
								</Button>
							</div>
						) : filteredKeywords.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<Filter className="h-12 w-12 text-gray-300 mb-4" />
								<p className="text-gray-600">No {typeFilter} keywords found</p>
								<p className="text-sm text-gray-400 mt-1">
									Try changing the filter or add new keywords
								</p>
								<Button variant="outline" className="mt-4" onClick={() => setTypeFilter("all")}>
									Clear Filter
								</Button>
							</div>
						) : (
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-12">
												<Checkbox
													checked={selectedIds.size === sortedKeywords.length && sortedKeywords.length > 0}
													onCheckedChange={(checked) => {
														if (checked) {
															setSelectedIds(new Set(sortedKeywords.map((k) => k.keywordId)));
														} else {
															setSelectedIds(new Set());
														}
													}}
												/>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50 select-none"
												onClick={() => handleSortClick("keyword")}
											>
												<div className="flex items-center gap-1">
													Keyword
													{sortColumn === "keyword" && (
														sortDirection === "asc" ?
															<ArrowUp className="h-4 w-4" /> :
															<ArrowDown className="h-4 w-4" />
													)}
												</div>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50 select-none"
												onClick={() => handleSortClick("type")}
											>
												<Tooltip>
													<TooltipTrigger className="flex items-center gap-1">
														Type
														{sortColumn === "type" && (
															sortDirection === "asc" ?
																<ArrowUp className="h-4 w-4" /> :
																<ArrowDown className="h-4 w-4" />
														)}
														<AlertCircle className="h-3 w-3 text-muted-foreground" />
													</TooltipTrigger>
													<TooltipContent className="max-w-xs">
														<p>
															Primary keywords trigger AI title generation.
															Secondary keywords only get difficulty/volume analysis.
															Click to toggle.
														</p>
													</TooltipContent>
												</Tooltip>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50 select-none"
												onClick={() => handleSortClick("difficulty")}
											>
												<Tooltip>
													<TooltipTrigger className="flex items-center gap-1">
														Difficulty
														{sortColumn === "difficulty" && (
															sortDirection === "asc" ?
																<ArrowUp className="h-4 w-4" /> :
																<ArrowDown className="h-4 w-4" />
														)}
														<AlertCircle className="h-3 w-3 text-muted-foreground" />
													</TooltipTrigger>
													<TooltipContent className="max-w-xs">
														<p>
															Score from 0-100 indicating how hard it is to rank on Google&apos;s first page.
															Lower scores (0-30) are easier to rank for.
														</p>
													</TooltipContent>
												</Tooltip>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50 select-none"
												onClick={() => handleSortClick("volume")}
											>
												<Tooltip>
													<TooltipTrigger className="flex items-center gap-1">
														Volume
														{sortColumn === "volume" && (
															sortDirection === "asc" ?
																<ArrowUp className="h-4 w-4" /> :
																<ArrowDown className="h-4 w-4" />
														)}
														<AlertCircle className="h-3 w-3 text-muted-foreground" />
													</TooltipTrigger>
													<TooltipContent className="max-w-xs">
														<p>
															Average monthly searches on Google. Higher volume
															means more potential visitors to your article.
														</p>
													</TooltipContent>
												</Tooltip>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50 select-none"
												onClick={() => handleSortClick("recommendedTitle")}
											>
												<div className="flex items-center gap-1">
													Recommended Title
													{sortColumn === "recommendedTitle" && (
														sortDirection === "asc" ?
															<ArrowUp className="h-4 w-4" /> :
															<ArrowDown className="h-4 w-4" />
													)}
												</div>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50 select-none"
												onClick={() => handleSortClick("parent")}
											>
												<Tooltip>
													<TooltipTrigger className="flex items-center gap-1">
														Parent
														{sortColumn === "parent" && (
															sortDirection === "asc" ?
																<ArrowUp className="h-4 w-4" /> :
																<ArrowDown className="h-4 w-4" />
														)}
														<AlertCircle className="h-3 w-3 text-muted-foreground" />
													</TooltipTrigger>
													<TooltipContent className="max-w-xs">
														<p>
															Secondary keywords can be grouped under a primary keyword.
															Use the actions menu to assign a parent.
														</p>
													</TooltipContent>
												</Tooltip>
											</TableHead>
											<TableHead
												className="cursor-pointer hover:bg-muted/50 select-none"
												onClick={() => handleSortClick("status")}
											>
												<div className="flex items-center gap-1">
													Status
													{sortColumn === "status" && (
														sortDirection === "asc" ?
															<ArrowUp className="h-4 w-4" /> :
															<ArrowDown className="h-4 w-4" />
													)}
												</div>
											</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{sortedKeywords.map((keyword) => (
											<TableRow key={keyword.keywordId}>
												<TableCell>
													<Checkbox
														checked={selectedIds.has(keyword.keywordId)}
														onCheckedChange={(checked) =>
															handleSelectOne(keyword.keywordId, checked as boolean)
														}
													/>
												</TableCell>
												<TableCell className="font-medium">
													{keyword.keyword}
												</TableCell>
												<TableCell>
													<button
														onClick={() => handleTogglePrimary(keyword)}
														disabled={togglingPrimaryId === keyword.keywordId}
														className="cursor-pointer disabled:opacity-50"
													>
														{togglingPrimaryId === keyword.keywordId ? (
															<Badge variant="outline" className="bg-gray-100">
																<Loader2 className="h-3 w-3 animate-spin" />
															</Badge>
														) : (
															<TypeBadge isPrimary={keyword.isPrimary} />
														)}
													</button>
												</TableCell>
												<TableCell>
													<DifficultyBadge difficulty={keyword.difficulty} />
												</TableCell>
												<TableCell>
													<span className="font-mono">
														{formatVolume(keyword.volume)}
													</span>
													<span className="text-xs text-muted-foreground ml-1">
														/mo
													</span>
												</TableCell>
												<TableCell className="max-w-xs">
													{keyword.recommendedTitle ? (
														<Tooltip>
															<TooltipTrigger className="text-left truncate block max-w-52">
																{keyword.recommendedTitle}
															</TooltipTrigger>
															<TooltipContent className="max-w-sm">
																<p>{keyword.recommendedTitle}</p>
															</TooltipContent>
														</Tooltip>
													) : keyword.isPrimary ? (
														<span className="text-muted-foreground text-xs">Generating...</span>
													) : (
														<Tooltip>
															<TooltipTrigger className="text-muted-foreground text-xs cursor-help">
																N/A (Secondary)
															</TooltipTrigger>
															<TooltipContent>
																<p>Click on Type to make this a Primary keyword and generate a title</p>
															</TooltipContent>
														</Tooltip>
													)}
												</TableCell>
												<TableCell>
													{keyword.isPrimary ? (
														<span className="text-muted-foreground text-xs">—</span>
													) : keyword.parentKeywordId ? (
														<Tooltip>
															<TooltipTrigger className="text-left truncate block max-w-32">
																<Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
																	<Link2 className="h-3 w-3 mr-1" />
																	{keywords.find(k => k.keywordId === keyword.parentKeywordId)?.keyword?.substring(0, 15) || "Unknown"}
																</Badge>
															</TooltipTrigger>
															<TooltipContent>
																<p>Parent: {keywords.find(k => k.keywordId === keyword.parentKeywordId)?.keyword}</p>
															</TooltipContent>
														</Tooltip>
													) : (
														<span className="text-muted-foreground text-xs">Not assigned</span>
													)}
												</TableCell>
												<TableCell>
													{keyword.isAnalyzed ? (
														<Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
															Analyzed
														</Badge>
													) : (
														<Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
															<Loader2 className="h-3 w-3 mr-1 animate-spin" />
															Analyzing
														</Badge>
													)}
												</TableCell>
												<TableCell className="text-right">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant="ghost" size="sm">
																<MoreHorizontal className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															{/* Generate Article / Read Article action for primary keywords */}
															{keyword.isPrimary && (
																<>
																	{keywordArticles.has(keyword.keywordId) ? (
																		<DropdownMenuItem
																			onClick={() => handleReadArticleClick(keyword)}
																			className="text-green-600"
																		>
																			<FileText className="h-4 w-4 mr-2" />
																			Read Article
																		</DropdownMenuItem>
																	) : (
																		<DropdownMenuItem
																			onClick={() => handleGenerateArticleClick(keyword)}
																			className="text-purple-600"
																		>
																			<Sparkles className="h-4 w-4 mr-2" />
																			Generate Article
																		</DropdownMenuItem>
																	)}
																	<DropdownMenuSeparator />
																</>
															)}
															<DropdownMenuItem
																onClick={() => handleTogglePrimary(keyword)}
																disabled={togglingPrimaryId === keyword.keywordId}
															>
																{togglingPrimaryId === keyword.keywordId ? (
																	<Loader2 className="h-4 w-4 mr-2 animate-spin" />
																) : (
																	<Crown className="h-4 w-4 mr-2" />
																)}
																{keyword.isPrimary ? "Make Secondary" : "Make Primary"}
															</DropdownMenuItem>
															{!keyword.isPrimary && primaryKeywords.length > 0 && (
																<>
																	<DropdownMenuSeparator />
																	<DropdownMenuSub>
																		<DropdownMenuSubTrigger disabled={updatingParentId === keyword.keywordId}>
																			{updatingParentId === keyword.keywordId ? (
																				<Loader2 className="h-4 w-4 mr-2 animate-spin" />
																			) : (
																				<Link2 className="h-4 w-4 mr-2" />
																			)}
																			Set Parent Keyword
																		</DropdownMenuSubTrigger>
																		<DropdownMenuSubContent className='max-h-125! overflow-y-auto'>
																			{keyword.parentKeywordId && (
																				<>
																					<DropdownMenuItem
																						onClick={() => handleUpdateParentKeyword(keyword, null)}
																					>
																						<Unlink className="h-4 w-4 mr-2" />
																						Remove Parent
																					</DropdownMenuItem>
																					<DropdownMenuSeparator />
																				</>
																			)}
																			{primaryKeywords.map((primary) => (
																				<DropdownMenuItem
																					key={primary.keywordId}
																					onClick={() => handleUpdateParentKeyword(keyword, primary.keywordId)}
																					disabled={keyword.parentKeywordId === primary.keywordId}
																				>
																					{keyword.parentKeywordId === primary.keywordId && (
																						<Check className="h-4 w-4 mr-2" />
																					)}
																					<span className={keyword.parentKeywordId === primary.keywordId ? "font-medium" : ""}>
																						{primary.keyword}
																					</span>
																				</DropdownMenuItem>
																			))}
																		</DropdownMenuSubContent>
																	</DropdownMenuSub>
																</>
															)}
															<DropdownMenuItem
																onClick={() => handleReanalyze(keyword)}
																disabled={reanalyzingId === keyword.keywordId}
															>
																{reanalyzingId === keyword.keywordId ? (
																	<Loader2 className="h-4 w-4 mr-2 animate-spin" />
																) : (
																	<RefreshCw className="h-4 w-4 mr-2" />
																)}
																Reanalyze
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => handleDeleteClick(keyword)}
																className="text-red-600"
																disabled={deletingId === keyword.keywordId}
															>
																{deletingId === keyword.keywordId ? (
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

				<AddKeywordsModal
					open={isAddModalOpen}
					onOpenChange={setIsAddModalOpen}
					onSuccess={fetchKeywords}
				/>

				{selectedKeywordForArticle && (
					<GenerateArticleModal
						open={isGenerateModalOpen}
						onOpenChange={(open) => {
							setIsGenerateModalOpen(open);
							if (!open) setSelectedKeywordForArticle(null);
						}}
						keyword={selectedKeywordForArticle}
						secondaryKeywords={getSecondaryKeywordsForPrimary(selectedKeywordForArticle.keywordId)}
						onSuccess={handleArticleGenerationSuccess}
					/>
				)}

				<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete Keyword</AlertDialogTitle>
							<AlertDialogDescription>
								Are you sure you want to delete the keyword &quot;{keywordToDelete?.keyword}&quot;?
								This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel className="cursor-pointer" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleConfirmDelete}
								className="bg-red-600 hover:bg-red-700 cursor-pointer"
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

				<AlertDialog open={isDeleteMultipleDialogOpen} onOpenChange={setIsDeleteMultipleDialogOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete Keywords</AlertDialogTitle>
							<AlertDialogDescription>
								Are you sure you want to delete {selectedIds.size} keyword{selectedIds.size > 1 ? "s" : ""}?
								This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel className="cursor-pointer" onClick={() => setIsDeleteMultipleDialogOpen(false)}>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDeleteSelected}
								className="bg-red-600 hover:bg-red-700 cursor-pointer"
								disabled={isDeletingMultiple}
							>
								{isDeletingMultiple ? (
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
