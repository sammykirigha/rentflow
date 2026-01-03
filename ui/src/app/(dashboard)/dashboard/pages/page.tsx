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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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
import { onboardingApi, WebsitePage } from "@/lib/api/onboarding.api";
import {
	AlertCircle,
	Eye,
	Link2,
	Loader2,
	MoreHorizontal,
	RefreshCw,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import ViewPageModal from "./components/view-page-modal";

// Helper to truncate text
const truncateText = (text: string | undefined, maxLength: number = 100): string => {
	if (!text) return "-";
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength) + "...";
};

// Helper to format word count
const formatWordCount = (count: number | undefined): string => {
	if (!count) return "-";
	return count.toLocaleString();
};

// Status badge component
const StatusBadge = ({ status }: { status: WebsitePage["scrapingStatus"]; }) => {
	const variants: Record<WebsitePage["scrapingStatus"], { color: string; label: string; }> = {
		pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
		processing: { color: "bg-blue-100 text-blue-800", label: "Processing" },
		completed: { color: "bg-green-100 text-green-800", label: "Completed" },
		failed: { color: "bg-red-100 text-red-800", label: "Failed" },
	};

	const variant = variants[status] || variants.pending;

	return (
		<Badge variant="outline" className={variant.color}>
			{variant.label}
		</Badge>
	);
};

export default function WebsitePagesPage() {
	const [pages, setPages] = useState<WebsitePage[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedPage, setSelectedPage] = useState<WebsitePage | null>(null);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [pageToDelete, setPageToDelete] = useState<WebsitePage | null>(null);
	const [refetchingPageId, setRefetchingPageId] = useState<string | null>(null);
	const [isDeletingPageId, setIsDeletingPageId] = useState<string | null>(null);

	const fetchPages = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			const data = await onboardingApi.getAllUserPages();
			setPages(data || []);
		} catch (err) {
			setError("Failed to load pages. Please try again.");
			console.error("Error fetching pages:", err);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchPages();
	}, [fetchPages]);

	const handleView = (page: WebsitePage) => {
		setSelectedPage(page);
		setIsViewModalOpen(true);
	};

	const handleRefetch = async (page: WebsitePage) => {
		try {
			setRefetchingPageId(page.pageId);
			const updatedPage = await onboardingApi.refetchPage(page.pageId);
			setPages(prev =>
				prev.map(p => (p.pageId === page.pageId ? updatedPage : p))
			);
			toast.success("Page refetched successfully");
		} catch (err) {
			toast.error("Failed to refetch page");
			console.error("Error refetching page:", err);
		} finally {
			setRefetchingPageId(null);
		}
	};

	const handleDeleteClick = (page: WebsitePage) => {
		setPageToDelete(page);
		setIsDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!pageToDelete) return;

		try {
			setIsDeletingPageId(pageToDelete.pageId);
			await onboardingApi.deletePage(pageToDelete.pageId);
			setPages(prev => prev.filter(p => p.pageId !== pageToDelete.pageId));
			toast.success("Page deleted successfully");
		} catch (err) {
			toast.error("Failed to delete page");
			console.error("Error deleting page:", err);
		} finally {
			setIsDeletingPageId(null);
			setIsDeleteDialogOpen(false);
			setPageToDelete(null);
		}
	};

	return (
		<TooltipProvider>
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Link2 className="h-5 w-5" />
									Website Pages
								</CardTitle>
								<CardDescription>
									View and manage scraped website pages
								</CardDescription>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={fetchPages}
								disabled={isLoading}
							>
								<RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
								Refresh
							</Button>
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
								<Button variant="outline" className="mt-4" onClick={fetchPages}>
									Try Again
								</Button>
							</div>
						) : pages.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<Link2 className="h-12 w-12 text-gray-300 mb-4" />
								<p className="text-gray-600">No pages found</p>
								<p className="text-sm text-gray-400 mt-1">
									Pages will appear here after website scraping
								</p>
							</div>
						) : (
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[200px]">Title</TableHead>
											<TableHead className="w-[250px]">Description</TableHead>
											<TableHead className="w-[200px]">URL</TableHead>
											<TableHead className="w-[100px] text-right">Word Count</TableHead>
											<TableHead className="w-[100px]">Status</TableHead>
											<TableHead className="w-[80px] text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{pages.map((page) => (
											<TableRow key={page.pageId}>
												<TableCell className="font-medium">
													<Tooltip>
														<TooltipTrigger asChild>
															<span className="cursor-default">
																{truncateText(page.pageTitle)}
															</span>
														</TooltipTrigger>
														{page.pageTitle && page.pageTitle.length > 100 && (
															<TooltipContent className="max-w-md">
																<p>{page.pageTitle}</p>
															</TooltipContent>
														)}
													</Tooltip>
												</TableCell>
												<TableCell>
													<Tooltip>
														<TooltipTrigger asChild>
															<span className="cursor-default text-gray-600">
																{truncateText(page.pageDescription)}
															</span>
														</TooltipTrigger>
														{page.pageDescription && page.pageDescription.length > 100 && (
															<TooltipContent className="max-w-md">
																<p>{page.pageDescription}</p>
															</TooltipContent>
														)}
													</Tooltip>
												</TableCell>
												<TableCell>
													<Tooltip>
														<TooltipTrigger asChild>
															<a
																href={page.pageUrl}
																target="_blank"
																rel="noopener noreferrer"
																className="text-blue-600 hover:underline cursor-pointer"
															>
																{truncateText(page.pageUrl)}
															</a>
														</TooltipTrigger>
														{page.pageUrl && page.pageUrl.length > 100 && (
															<TooltipContent className="max-w-md">
																<p>{page.pageUrl}</p>
															</TooltipContent>
														)}
													</Tooltip>
												</TableCell>
												<TableCell className="text-right">
													{formatWordCount(page.wordCount)}
												</TableCell>
												<TableCell>
													<StatusBadge status={page.scrapingStatus} />
												</TableCell>
												<TableCell className="text-right">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="sm"
																className="h-8 w-8 p-0"
															>
																<span className="sr-only">Open menu</span>
																<MoreHorizontal className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem onClick={() => handleView(page)}>
																<Eye className="h-4 w-4 mr-2" />
																View
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => handleRefetch(page)}
																disabled={refetchingPageId === page.pageId}
															>
																{refetchingPageId === page.pageId ? (
																	<Loader2 className="h-4 w-4 mr-2 animate-spin" />
																) : (
																	<RefreshCw className="h-4 w-4 mr-2" />
																)}
																Refetch Data
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => handleDeleteClick(page)}
																className="text-red-600 focus:text-red-600"
																disabled={isDeletingPageId === page.pageId}
															>
																{isDeletingPageId === page.pageId ? (
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

				{/* View Page Modal */}
				<ViewPageModal
					page={selectedPage}
					open={isViewModalOpen}
					onOpenChange={setIsViewModalOpen}
				/>

				{/* Delete Confirmation Dialog */}
				<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you sure?</AlertDialogTitle>
							<AlertDialogDescription>
								This will soft delete the page &quot;{pageToDelete?.pageTitle || pageToDelete?.pageUrl}&quot;.
								The data will be marked as deleted but can be recovered if needed.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={!!isDeletingPageId}>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleConfirmDelete}
								disabled={!!isDeletingPageId}
								className="bg-red-600 hover:bg-red-700"
							>
								{isDeletingPageId ? (
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
