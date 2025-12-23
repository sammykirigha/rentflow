"use client";

import { cn } from "@/lib/utils";
import { BookOpen, Brain, CheckCircle2, Lightbulb, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface ProcessingStep {
	id: number;
	icon: React.ReactNode;
	title: string;
	description: string;
}

const processingSteps: ProcessingStep[] = [
	{
		id: 1,
		icon: <BookOpen className="h-6 w-6" />,
		title: "Reading your question",
		description: "Understanding the context and requirements",
	},
	{
		id: 2,
		icon: <Brain className="h-6 w-6" />,
		title: "Analyzing concepts",
		description: "Breaking down the problem into key components",
	},
	{
		id: 3,
		icon: <Lightbulb className="h-6 w-6" />,
		title: "Generating insights",
		description: "Finding the best approach to solve this",
	},
	{
		id: 4,
		icon: <Sparkles className="h-6 w-6" />,
		title: "Crafting your answer",
		description: "Creating a clear, step-by-step explanation",
	},
];

const engagingFacts = [
	"💡 Did you know? AI can process millions of data points in seconds!",
	"🧠 Fun fact: Your brain has about 86 billion neurons!",
	"📚 Tip: Breaking problems into smaller parts makes them easier to solve!",
	"⚡ AI tutors can adapt to your learning style in real-time!",
	"🎯 Students using AI tutors improve 30% faster on average!",
	"🌟 Every question you ask makes you smarter!",
	"🔬 Science shows that asking questions is key to deep learning!",
	"🚀 You're one step closer to mastering this topic!",
];

interface AIProcessingLoaderProps {
	className?: string;
	variant?: "default" | "minimal" | "detailed";
	showFacts?: boolean;
}

export default function AIProcessingLoader({
	className,
	variant = "default",
	showFacts = true,
}: AIProcessingLoaderProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [completedSteps, setCompletedSteps] = useState<number[]>([]);
	const [currentFact, setCurrentFact] = useState(0);

	// Animate through steps
	useEffect(() => {
		const stepInterval = setInterval(() => {
			setCurrentStep((prev) => {
				const next = (prev + 1) % processingSteps.length;
				if (next !== 0) {
					setCompletedSteps((completed) => [...completed, prev]);
				} else {
					setCompletedSteps([]);
				}
				return next;
			});
		}, 2500);

		return () => clearInterval(stepInterval);
	}, []);

	// Rotate through engaging facts
	useEffect(() => {
		const factInterval = setInterval(() => {
			setCurrentFact((prev) => (prev + 1) % engagingFacts.length);
		}, 4000);

		return () => clearInterval(factInterval);
	}, []);

	if (variant === "minimal") {
		return (
			<div className={cn("flex flex-col items-center justify-center p-6", className)}>
				{/* Animated Brain Icon */}
				<div className="relative mb-6">
					<div className="absolute inset-0 bg-linear-to-r from-purple-500 to-blue-500 rounded-full blur-xl opacity-30 animate-pulse" />
					<div className="relative w-20 h-20 bg-linear-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center animate-bounce">
						<Brain className="h-10 w-10 text-white" />
					</div>
					{/* Orbiting particles */}
					<div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
						<div className="absolute -top-1 left-1/2 w-2 h-2 bg-yellow-400 rounded-full" />
					</div>
					<div className="absolute inset-0 animate-spin" style={{ animationDuration: "4s", animationDirection: "reverse" }}>
						<div className="absolute top-1/2 -right-1 w-2 h-2 bg-green-400 rounded-full" />
					</div>
				</div>

				<p className="text-lg font-medium text-gray-700 mb-2">
					{processingSteps[currentStep].title}
				</p>
				<p className="text-sm text-gray-500 text-center max-w-xs">
					{processingSteps[currentStep].description}
				</p>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col items-center justify-center p-8 max-w-md mx-auto", className)}>
			{/* Header Animation */}
			<div className="relative mb-8">
				<div className="absolute inset-0 bg-linear-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-full blur-2xl opacity-20 animate-pulse" />
				<div className="relative flex items-center justify-center">
					{/* Central animated icon */}
					<div className="w-24 h-24 bg-linear-to-br from-purple-600 via-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl transform transition-transform duration-500 hover:scale-105">
						<div className="animate-pulse">
							<Zap className="h-12 w-12 text-white" />
						</div>
					</div>

					{/* Floating particles */}
					<div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
					<div className="absolute -top-1 -right-3 w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
					<div className="absolute -bottom-2 -left-1 w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
					<div className="absolute -bottom-3 -right-2 w-4 h-4 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.6s" }} />
				</div>
			</div>

			{/* Title */}
			<h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
				AI is thinking...
			</h3>
			<p className="text-sm text-gray-500 mb-8 text-center">
				Preparing the perfect answer for you
			</p>

			{/* Progress Steps */}
			<div className="w-full space-y-3 mb-8">
				{processingSteps.map((step, index) => {
					const isCompleted = completedSteps.includes(index);
					const isCurrent = currentStep === index;
					const isPending = !isCompleted && !isCurrent;

					return (
						<div
							key={step.id}
							className={cn(
								"flex items-center gap-4 p-3 rounded-xl transition-all duration-500",
								isCompleted && "bg-green-50 border border-green-200",
								isCurrent && "bg-blue-50 border border-blue-200 shadow-md scale-105",
								isPending && "bg-gray-50 border border-gray-100 opacity-50"
							)}
						>
							{/* Icon */}
							<div
								className={cn(
									"w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-500",
									isCompleted && "bg-green-500 text-white",
									isCurrent && "bg-blue-500 text-white animate-pulse",
									isPending && "bg-gray-200 text-gray-400"
								)}
							>
								{isCompleted ? <CheckCircle2 className="h-5 w-5" /> : step.icon}
							</div>

							{/* Text */}
							<div className="flex-1 min-w-0">
								<p
									className={cn(
										"font-medium text-sm transition-colors duration-300",
										isCompleted && "text-green-700",
										isCurrent && "text-blue-700",
										isPending && "text-gray-400"
									)}
								>
									{step.title}
								</p>
								<p
									className={cn(
										"text-xs transition-colors duration-300 truncate",
										isCompleted && "text-green-600",
										isCurrent && "text-blue-600",
										isPending && "text-gray-400"
									)}
								>
									{step.description}
								</p>
							</div>

							{/* Status indicator */}
							{isCurrent && (
								<div className="flex gap-1">
									<div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
									<div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
									<div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Progress Bar */}
			<div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-6">
				<div
					className="h-full bg-linear-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-full transition-all duration-500 ease-out"
					style={{
						width: `${((completedSteps.length + 1) / processingSteps.length) * 100}%`,
					}}
				/>
			</div>

			{/* Engaging Facts */}
			{showFacts && (
				<div className="w-full p-4 bg-linear-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
					<p
						key={currentFact}
						className="text-sm text-amber-800 text-center"
						style={{ animation: "fadeIn 0.5s ease-in-out" }}
					>
						{engagingFacts[currentFact]}
					</p>
				</div>
			)}
		</div>
	);
}

// Export a simpler inline loader for button states
export function InlineAILoader({ text = "Processing" }: { text?: string; }) {
	return (
		<div className="flex items-center gap-2">
			<div className="relative w-5 h-5">
				<div className="absolute inset-0 border-2 border-white/30 rounded-full" />
				<div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin" />
			</div>
			<span>{text}</span>
			<span className="flex gap-0.5">
				<span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
				<span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
				<span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
			</span>
		</div>
	);
}
