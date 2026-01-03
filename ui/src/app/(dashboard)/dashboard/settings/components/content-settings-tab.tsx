"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import settingsApi from "@/lib/api/settings.api";
import { SystemSetting } from "@/types/settings";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Save } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const formSchema = z.object({
	contentBriefingPrompt: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ContentSettingsTab() {
	const queryClient = useQueryClient();

	// Fetch settings
	const { data: settings, isLoading } = useQuery({
		queryKey: ['settings'],
		queryFn: settingsApi.getSettings,
	});

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			contentBriefingPrompt: settings?.contentBriefingPrompt ?? "",
		},
	});

	// Update form when settings load
	React.useEffect(() => {
		if (settings) {
			form.reset({
				contentBriefingPrompt: settings.contentBriefingPrompt ?? "",
			});
		}
	}, [settings, form]);

	// Update mutation
	const updateMutation = useMutation({
		mutationFn: (data: Partial<SystemSetting>) => settingsApi.updateSettings(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['settings'] });
			toast.success('Content settings updated successfully');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to update content settings');
		},
	});

	const onSubmit = (data: FormData) => {
		updateMutation.mutate(data);
	};

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center justify-center py-12">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Content Generation Settings
					</CardTitle>
					<CardDescription>
						Configure prompts and settings for content generation
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
							{/* Content Briefing Prompt */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium flex items-center gap-2">
									<FileText className="h-5 w-5" />
									Article Generation
								</h3>

								<FormField
									control={form.control}
									name="contentBriefingPrompt"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Content Briefing Prompt</FormLabel>
											<FormControl>
												<Textarea
													placeholder="Enter the prompt to be used for generating article content briefings..."
													className="max-h-50"
													rows={10}
													{...field}
												/>
											</FormControl>
											<FormDescription>
												This prompt will be used as the base instruction for generating article content.
												You can include placeholders like {'{topic}'}, {'{keywords}'}, {'{tone}'} etc.
												to be replaced dynamically during generation.
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{/* Save Button */}
							<div className="flex justify-end pt-4 border-t">
								<Button
									type="submit"
									disabled={updateMutation.isPending}
									className="flex items-center gap-2"
								>
									<Save className="h-4 w-4" />
									{updateMutation.isPending ? "Saving..." : "Save Changes"}
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
