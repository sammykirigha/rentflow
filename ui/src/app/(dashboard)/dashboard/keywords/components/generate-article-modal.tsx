"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getActiveAiModels } from "@/lib/api/ai-models.api";
import { Article, articlesApi, CreateArticleDto } from "@/lib/api/articles.api";
import { Keyword } from "@/lib/api/keywords.api";
import settingsApi from "@/lib/api/settings.api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Bot,
	CheckCircle2,
	FileText,
	Key,
	Loader2,
	RefreshCw,
	Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const formSchema = z.object({
	title: z.string().min(1, "Title is required").max(500, "Title too long"),
	contentBriefing: z.string().min(1, "Content briefing is required"),
	referenceContent: z.string().optional(),
	aiModelId: z.string().optional(),
	secondaryKeywordIds: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface GenerateArticleModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	keyword: Keyword;
	secondaryKeywords: Keyword[];
	onSuccess?: (article: Article) => void;
}

export default function GenerateArticleModal({
	open,
	onOpenChange,
	keyword,
	secondaryKeywords,
	onSuccess,
}: GenerateArticleModalProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [isRegeneratingTitle, setIsRegeneratingTitle] = useState(false);
	const [generatedArticle, setGeneratedArticle] = useState<Article | null>(null);

	// Fetch system settings for content briefing prompt
	const { data: settings } = useQuery({
		queryKey: ["settings"],
		queryFn: settingsApi.getSettings,
	});

	// Fetch active AI models
	const { data: aiModels, isLoading: isLoadingModels } = useQuery({
		queryKey: ["ai-models", "active"],
		queryFn: getActiveAiModels,
	});

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: keyword.recommendedTitle || "",
			contentBriefing: "",
			referenceContent: "",
			aiModelId: "",
			secondaryKeywordIds: [],
		},
	});

	// Update form with settings content briefing
	useEffect(() => {
		if (settings?.contentBriefingPrompt) {
			form.setValue("contentBriefing", settings.contentBriefingPrompt);
		}
	}, [settings, form]);

	// Update form with keyword recommended title
	useEffect(() => {
		if (keyword.recommendedTitle) {
			form.setValue("title", keyword.recommendedTitle);
		}
	}, [keyword, form]);

	// Set default AI model
	useEffect(() => {
		if (aiModels && aiModels.length > 0) {
			const defaultModel = aiModels.find((m) => m.isDefault);
			if (defaultModel) {
				form.setValue("aiModelId", defaultModel.modelId);
			}
		}
	}, [aiModels, form]);

	// Regenerate title mutation
	const regenerateTitleMutation = useMutation({
		mutationFn: () =>
			articlesApi.regenerateTitle({
				primaryKeywordId: keyword.keywordId,
			}),
		onSuccess: (data) => {
			form.setValue("title", data.title);
			toast.success("Title regenerated");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Failed to regenerate title");
		},
	});

	// Create article mutation
	const createArticleMutation = useMutation({
		mutationFn: (data: CreateArticleDto) => articlesApi.createArticle(data),
		onSuccess: (article) => {
			setGeneratedArticle(article);
			queryClient.invalidateQueries({ queryKey: ["articles"] });
			queryClient.invalidateQueries({ queryKey: ["keywords"] });
			toast.success("Article generation started!");
			onSuccess?.(article);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Failed to create article");
		},
	});

	const handleRegenerateTitle = async () => {
		setIsRegeneratingTitle(true);
		try {
			await regenerateTitleMutation.mutateAsync();
		} finally {
			setIsRegeneratingTitle(false);
		}
	};

	const onSubmit = (data: FormData) => {
		createArticleMutation.mutate({
			title: data.title,
			contentBriefing: data.contentBriefing,
			referenceContent: data.referenceContent,
			primaryKeywordId: keyword.keywordId,
			secondaryKeywordIds: data.secondaryKeywordIds,
			aiModelId: data.aiModelId || undefined,
		});
	};

	const handleClose = () => {
		setGeneratedArticle(null);
		form.reset();
		onOpenChange(false);
	};

	const handleReadArticle = () => {
		if (generatedArticle) {
			router.push(`/dashboard/articles/${generatedArticle.articleId}`);
			handleClose();
		}
	};

	// Show success state
	if (generatedArticle) {
		return (
			<Dialog open={open} onOpenChange={handleClose}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<CheckCircle2 className="h-5 w-5 text-green-500" />
							Article Generation Started
						</DialogTitle>
						<DialogDescription>
							Your article is being generated. This may take a few moments.
						</DialogDescription>
					</DialogHeader>
					<div className="py-6 space-y-4">
						<div className="bg-green-50 border border-green-200 rounded-lg p-4">
							<h3 className="font-semibold text-green-800 mb-2">
								{generatedArticle.title}
							</h3>
							<div className="flex items-center gap-2 text-sm text-green-600">
								<Badge variant="outline" className="bg-green-100">
									{generatedArticle.status}
								</Badge>
								<span>•</span>
								<span>Keyword: {keyword.keyword}</span>
							</div>
						</div>
						<p className="text-sm text-muted-foreground">
							You can view the article progress and content in the Articles
							section. The page will automatically update when generation is
							complete.
						</p>
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={handleClose}>
							Close
						</Button>
						<Button onClick={handleReadArticle} className="gap-2">
							<FileText className="h-4 w-4" />
							View Article
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles className="h-5 w-5 text-purple-500" />
						Generate Article
					</DialogTitle>
					<DialogDescription>
						Generate an SEO-optimized article for the keyword &quot;
						{keyword.keyword}&quot;
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
						{/* Title with Regenerate */}
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center gap-2">
										<FileText className="h-4 w-4" />
										Article Title
									</FormLabel>
									<div className="flex gap-2">
										<FormControl>
											<Input
												placeholder="Enter article title..."
												{...field}
												className="flex-1"
											/>
										</FormControl>
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={handleRegenerateTitle}
											disabled={isRegeneratingTitle}
										>
											{isRegeneratingTitle ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<RefreshCw className="h-4 w-4" />
											)}
										</Button>
									</div>
									<FormDescription>
										The title for your article. Click the refresh button to
										regenerate with AI.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Content Briefing */}
						<FormField
							control={form.control}
							name="contentBriefing"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center gap-2">
										<Sparkles className="h-4 w-4" />
										Content Briefing
									</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Instructions for article generation..."
											className="max-h-32"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Instructions and guidelines for the AI to follow when
										generating the article content.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Reference Content */}
						<FormField
							control={form.control}
							name="referenceContent"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center gap-2">
										<FileText className="h-4 w-4" />
										Reference Content (Optional)
									</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Paste website content or reference material here..."
											className="max-h-32"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Optional reference content from websites that the AI can
										draw from when writing the article.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* AI Model Selection */}
						<FormField
							control={form.control}
							name="aiModelId"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center gap-2">
										<Bot className="h-4 w-4" />
										AI Model
									</FormLabel>
									<Select
										onValueChange={field.onChange}
										value={field.value}
										disabled={isLoadingModels}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select AI model..." />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{aiModels?.map((model) => (
												<SelectItem key={model.modelId} value={model.modelId}>
													<div className="flex items-center gap-2">
														<span>{model.displayName}</span>
														{model.isDefault && (
															<Badge variant="secondary" className="text-xs">
																Default
															</Badge>
														)}
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormDescription>
										Choose which AI model to use for generating the article.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Secondary Keywords Multi-select */}
						{secondaryKeywords.length > 0 && (
							<FormField
								control={form.control}
								name="secondaryKeywordIds"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="flex items-center gap-2">
											<Key className="h-4 w-4" />
											Secondary Keywords
										</FormLabel>
										<div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
											{secondaryKeywords.map((sk) => {
												const isSelected = field.value?.includes(sk.keywordId);
												return (
													<div
														key={sk.keywordId}
														className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${isSelected
															? "bg-purple-100 border border-purple-300"
															: "bg-gray-50 hover:bg-gray-100"
															}`}
														onClick={() => {
															const newValue = isSelected
																? field.value?.filter(
																	(id) => id !== sk.keywordId
																)
																: [...(field.value || []), sk.keywordId];
															field.onChange(newValue);
														}}
													>
														<span className="text-sm">{sk.keyword}</span>
														{isSelected && (
															<CheckCircle2 className="h-4 w-4 text-purple-600" />
														)}
													</div>
												);
											})}
										</div>
										<FormDescription>
											Select secondary keywords to incorporate into the article.
											These will be naturally woven into the content.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						<DialogFooter className="gap-2 sm:gap-0 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={handleClose}
								disabled={createArticleMutation.isPending}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={createArticleMutation.isPending}
								className="gap-2"
							>
								{createArticleMutation.isPending ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Generating...
									</>
								) : (
									<>
										<Sparkles className="h-4 w-4" />
										Generate Article
									</>
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
