"use client";

import LoginForm from "@/components/forms/login-form";
import RegisterForm from "@/components/forms/register-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, Sparkles, UserPlus } from "lucide-react";

interface LoginPromptModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
	title?: string;
	description?: string;
}

export default function LoginPromptModal({
	open,
	onOpenChange,
	onSuccess,
	title = "Sign in to continue",
	description = "Create an account or sign in to ask follow-up questions and get unlimited AI-powered help.",
}: LoginPromptModalProps) {
	const handleSuccess = () => {
		onSuccess?.();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader className="text-center space-y-3">
					<div className="mx-auto w-16 h-16 bg-linear-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
						<Sparkles className="h-8 w-8 text-white" />
					</div>
					<DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
					<DialogDescription className="text-base">
						{description}
					</DialogDescription>
				</DialogHeader>

				{/* Benefits list */}
				{/* <div className="py-4 space-y-3">
					<div className="flex items-center gap-3 text-sm text-gray-600">
						<div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
							<svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<span>Unlimited follow-up questions</span>
					</div>
					<div className="flex items-center gap-3 text-sm text-gray-600">
						<div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
							<svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<span>Save your conversation history</span>
					</div>
					<div className="flex items-center gap-3 text-sm text-gray-600">
						<div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
							<svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<span>Get personalized learning insights</span>
					</div>
				</div> */}

				<Tabs defaultValue="login" className="w-full">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="login" className="flex items-center gap-2">
							<LogIn className="h-4 w-4" />
							Sign In
						</TabsTrigger>
						<TabsTrigger value="register" className="flex items-center gap-2">
							<UserPlus className="h-4 w-4" />
							Sign Up
						</TabsTrigger>
					</TabsList>
					<TabsContent value="login" className="mt-4">
						<LoginForm onSuccess={handleSuccess} isModal={true} />
					</TabsContent>
					<TabsContent value="register" className="mt-4">
						<RegisterForm onSuccess={handleSuccess} isModal={true} />
					</TabsContent>
				</Tabs>

				<div className="mt-4 text-center">
					<Button
						variant="ghost"
						className="text-sm text-gray-500 hover:text-gray-700"
						onClick={() => onOpenChange(false)}
					>
						Maybe later
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
