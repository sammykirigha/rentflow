"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { articlesApi } from "@/lib/api/articles.api";
import { useMutation } from "@tanstack/react-query";
import { BrainCog, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

interface EditWithAiModalProps {
	articleId: string;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

export function EditWithAiModal({
	articleId,
	isOpen,
	onClose,
	onSuccess,
}: EditWithAiModalProps) {
	const [instructions, setInstructions] = useState("");

	const editWithAiMutation = useMutation({
		mutationFn: () => articlesApi.editWithAi(articleId, { instructions }),
		onSuccess: () => {
			toast.success("AI is editing your article. This may take a moment...");
			setInstructions("");
			onSuccess();
			onClose();
		},
		onError: (error: Error) => {
			toast.error(error.message || "Failed to start AI editing");
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!instructions.trim()) {
			toast.error("Please enter instructions for the AI");
			return;
		}
		editWithAiMutation.mutate();
	};

	const handleClose = () => {
		if (!editWithAiMutation.isPending) {
			setInstructions("");
			onClose();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-125">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<BrainCog className="h-5 w-5 text-primary" />
						Edit Article with AI
					</DialogTitle>
					<DialogDescription>
						Describe how you want the AI to modify this article. Be specific about what changes you&apos;d like to see.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="instructions">
							Describe how you want the AI to modify this article:
						</Label>
						<Textarea
							id="instructions"
							placeholder="e.g., Make the tone more conversational, add more examples, expand the introduction, simplify technical terms..."
							value={instructions}
							onChange={(e) => setInstructions(e.target.value)}
							rows={5}
							className="resize-none"
							disabled={editWithAiMutation.isPending}
							maxLength={2000}
						/>
						<p className="text-xs text-muted-foreground text-right">
							{instructions.length}/2000 characters
						</p>
					</div>

					<div className="bg-blue-50 border border-blue-200 rounded-md p-3">
						<div className="flex items-start gap-2">
							<Sparkles className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
							<div className="text-sm text-blue-800">
								<p className="font-medium">Tips for better results:</p>
								<ul className="mt-1 space-y-1 text-blue-700">
									<li>• Be specific about what sections to change</li>
									<li>• Mention the desired tone or style</li>
									<li>• Specify if you want content added or removed</li>
								</ul>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={editWithAiMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={editWithAiMutation.isPending || !instructions.trim()}
						>
							{editWithAiMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Starting...
								</>
							) : (
								<>
									<BrainCog className="mr-2 h-4 w-4" />
									Edit with AI
								</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
