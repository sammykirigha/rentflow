"use client";

import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { WebsitePage } from "@/lib/api/onboarding.api";
import {
	Calendar,
	ExternalLink,
	FileText,
	Globe,
	Hash,
	Link2,
	Tag,
} from "lucide-react";

interface ViewPageModalProps {
	page: WebsitePage | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

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

// Format date helper
const formatDate = (dateString: string | undefined): string => {
	if (!dateString) return "-";
	return new Date(dateString).toLocaleString();
};

export default function ViewPageModal({ page, open, onOpenChange }: ViewPageModalProps) {
	if (!page) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl! max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Page Details
					</DialogTitle>
					<DialogDescription>
						View complete information about this scraped page
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 pr-2">
					{/* Basic Info */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
							Basic Information
						</h3>

						<div className="grid gap-4">
							<div>
								<label className="text-sm font-medium text-gray-500">Title</label>
								<p className="mt-1 text-gray-900">
									{page.pageTitle || "-"}
								</p>
							</div>

							<div>
								<label className="text-sm font-medium text-gray-500">Description</label>
								<p className="mt-1 text-gray-900">
									{page.pageDescription || "-"}
								</p>
							</div>

							<div className="flex items-center gap-2">
								<Globe className="h-4 w-4 text-gray-400" />
								<label className="text-sm font-medium text-gray-500">URL</label>
								<a
									href={page.pageUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-600 hover:underline flex items-center gap-1"
								>
									{page.pageUrl}
									<ExternalLink className="h-3 w-3" />
								</a>
							</div>

							<div className="flex items-center gap-2">
								<Link2 className="h-4 w-4 text-gray-400" />
								<label className="text-sm font-medium text-gray-500">Path</label>
								<code className="bg-gray-100 px-2 py-0.5 rounded text-sm">
									{page.pagePath}
								</code>
							</div>

							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2">
									<Hash className="h-4 w-4 text-gray-400" />
									<label className="text-sm font-medium text-gray-500">Word Count:</label>
									<span className="text-gray-900">
										{page.wordCount?.toLocaleString() || "-"}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-gray-500">Depth:</label>
									<span className="text-gray-900">{page.depth}</span>
								</div>
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-gray-500">Status:</label>
									<StatusBadge status={page.scrapingStatus} />
								</div>
							</div>
						</div>
					</div>

					<Separator />

					{/* Scraped Meta */}
					{page.scrapedMeta && (
						<>
							<div className="space-y-4">
								<h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
									Meta Information
								</h3>

								{page.scrapedMeta.keywords && page.scrapedMeta.keywords.length > 0 && (
									<div>
										<label className="text-sm font-medium text-gray-500 flex items-center gap-2">
											<Tag className="h-4 w-4" />
											Keywords
										</label>
										<div className="mt-2 flex flex-wrap gap-2">
											{page.scrapedMeta.keywords.map((keyword, index) => (
												<Badge key={index} variant="secondary">
													{keyword}
												</Badge>
											))}
										</div>
									</div>
								)}

								{page.scrapedMeta.headings && page.scrapedMeta.headings.length > 0 && (
									<div>
										<label className="text-sm font-medium text-gray-500">Headings</label>
										<ul className="mt-2 space-y-1">
											{page.scrapedMeta.headings.slice(0, 10).map((heading, index) => (
												<li key={index} className="text-sm text-gray-700">
													• {heading}
												</li>
											))}
											{page.scrapedMeta.headings.length > 10 && (
												<li className="text-sm text-gray-400 italic">
													...and {page.scrapedMeta.headings.length - 10} more
												</li>
											)}
										</ul>
									</div>
								)}

								{page.scrapedMeta.internalLinks && page.scrapedMeta.internalLinks.length > 0 && (
									<div>
										<label className="text-sm font-medium text-gray-500">
											Internal Links ({page.scrapedMeta.internalLinks.length})
										</label>
										<ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
											{page.scrapedMeta.internalLinks.slice(0, 10).map((link, index) => (
												<li key={index} className="text-sm text-blue-600 truncate">
													{link}
												</li>
											))}
											{page.scrapedMeta.internalLinks.length > 10 && (
												<li className="text-sm text-gray-400 italic">
													...and {page.scrapedMeta.internalLinks.length - 10} more
												</li>
											)}
										</ul>
									</div>
								)}

								{page.scrapedMeta.externalLinks && page.scrapedMeta.externalLinks.length > 0 && (
									<div>
										<label className="text-sm font-medium text-gray-500">
											External Links ({page.scrapedMeta.externalLinks.length})
										</label>
										<ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
											{page.scrapedMeta.externalLinks.slice(0, 10).map((link, index) => (
												<li key={index} className="text-sm text-blue-600 truncate">
													<a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline">
														{link}
													</a>
												</li>
											))}
											{page.scrapedMeta.externalLinks.length > 10 && (
												<li className="text-sm text-gray-400 italic">
													...and {page.scrapedMeta.externalLinks.length - 10} more
												</li>
											)}
										</ul>
									</div>
								)}
							</div>

							<Separator />
						</>
					)}

					{/* Content Preview */}
					{page.scrapedContent && (
						<>
							<div className="space-y-4">
								<h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
									Content Preview
								</h3>
								<div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
									<p className="text-sm text-gray-700 whitespace-pre-wrap">
										{page.scrapedContent}
										{page.scrapedContent.substring(0, 2000)}
										{/* {page.scrapedContent.length > 2000 && (
											<span className="text-gray-400 italic">
												... (content truncated)
											</span>
										)} */}
									</p>
								</div>
							</div>

							<Separator />
						</>
					)}

					{/* Error Info */}
					{page.scrapingError && (
						<>
							<div className="space-y-4">
								<h3 className="text-sm font-semibold text-red-500 uppercase tracking-wider">
									Scraping Error
								</h3>
								<div className="bg-red-50 rounded-lg p-4">
									<p className="text-sm text-red-700">{page.scrapingError}</p>
								</div>
							</div>

							<Separator />
						</>
					)}

					{/* Timestamps */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
							Timestamps
						</h3>
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4 text-gray-400" />
								<span className="text-gray-500">Created:</span>
								<span className="text-gray-900">{formatDate(page.createdAt)}</span>
							</div>
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4 text-gray-400" />
								<span className="text-gray-500">Updated:</span>
								<span className="text-gray-900">{formatDate(page.updatedAt)}</span>
							</div>
							{page.scrapedAt && (
								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4 text-gray-400" />
									<span className="text-gray-500">Last Scraped:</span>
									<span className="text-gray-900">{formatDate(page.scrapedAt)}</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
