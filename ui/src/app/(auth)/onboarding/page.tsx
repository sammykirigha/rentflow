'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { onboardingApi, type PageStats, type UserWebsite } from '@/lib/api/onboarding.api';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/user.store';
import { CheckCircle2, FileText, Globe, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const STEPS = [
	{ id: 1, title: 'Add Website', description: 'Enter your website URL' },
	{ id: 2, title: 'Analyze', description: 'We analyze your website' },
	{ id: 3, title: 'Get Started', description: 'Start using GetAISEO' },
];

export default function OnboardingPage() {
	const router = useRouter();
	const user = useUserStore(state => state.user);
	const [currentStep, setCurrentStep] = useState(1);
	const [websiteUrl, setWebsiteUrl] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [website, setWebsite] = useState<UserWebsite | null>(null);
	const [pageStats, setPageStats] = useState<PageStats | null>(null);
	const [scrapingProgress, setScrapingProgress] = useState(0);
	const [isLoading, setIsLoading] = useState(true);

	// Fetch onboarding status on mount
	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const status = await onboardingApi.getOnboardingStatus();

				// If already onboarded, redirect to dashboard
				if (status.isOnboarded) {
					router.push('/dashboard');
					return;
				}

				// Resume from where they left off
				if (status.hasWebsite && status.website) {
					setWebsite(status.website);
					setWebsiteUrl(status.website.websiteUrl);
					if (status.pageStats) {
						setPageStats(status.pageStats);
					}

					if (status.websiteStatus === 'completed') {
						setCurrentStep(3);
						setScrapingProgress(100);
					} else if (status.websiteStatus === 'processing') {
						setCurrentStep(2);
						// Start polling for status
						pollScrapingStatus(status.website.websiteId);
					} else if (status.websiteStatus === 'pending') {
						setCurrentStep(2);
					} else if (status.websiteStatus === 'failed') {
						setCurrentStep(1);
						toast.error('Previous scraping failed. Please try again.');
					}
				}
			} catch (error) {
				console.error('Failed to fetch onboarding status:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchStatus();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router]);

	// Poll for scraping status when on step 2
	const pollScrapingStatus = useCallback(async (websiteId: string) => {
		const poll = async () => {
			try {
				const statusResponse = await onboardingApi.getScrapingStatus(websiteId);
				const { website: ws, pageStats: ps } = statusResponse;
				setWebsite(ws);
				setPageStats(ps);

				// Calculate progress based on pages scraped
				let progress = 10; // Base progress for starting
				if (ws.totalPagesFound > 0) {
					// Main page scraped = 30%, internal pages = remaining 70%
					const mainPageDone = ws.scrapedAt ? 30 : 0;
					const pageProgress = ps.total > 0
						? ((ps.completed / ps.total) * 60)
						: 0;
					progress = Math.min(mainPageDone + pageProgress + 10, 95);
				}
				setScrapingProgress(progress);

				if (ws.scrapingStatus === 'completed') {
					setScrapingProgress(100);
					setTimeout(() => {
						setCurrentStep(3);
					}, 500);
					return true;
				} else if (ws.scrapingStatus === 'failed') {
					setScrapingProgress(0);
					toast.error(ws.scrapingError || 'Failed to analyze website. Please try again.');
					setCurrentStep(1);
					return true;
				}
				return false;
			} catch (error) {
				console.error('Failed to poll status:', error);
				return false;
			}
		};

		// Poll every 2 seconds
		const pollInterval = setInterval(async () => {
			const done = await poll();
			if (done) {
				clearInterval(pollInterval);
			}
		}, 2000);

		// Initial poll
		await poll();

		return () => {
			clearInterval(pollInterval);
		};
	}, []);

	// Handle website submission
	const handleSubmitWebsite = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!websiteUrl.trim()) {
			toast.error('Please enter a website URL');
			return;
		}

		setIsSubmitting(true);
		try {
			// Step 1: Submit website
			const newWebsite = await onboardingApi.submitWebsite(websiteUrl);
			setWebsite(newWebsite);
			setCurrentStep(2);
			setScrapingProgress(5);

			// Step 2: Start scraping
			await onboardingApi.startScraping(newWebsite.websiteId);

			// Poll for completion
			pollScrapingStatus(newWebsite.websiteId);
		} catch (error) {
			console.error('Failed to submit website:', error);
			toast.error('Failed to submit website. Please check the URL and try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle completing onboarding
	const handleCompleteOnboarding = async () => {
		setIsSubmitting(true);
		try {
			await onboardingApi.completeOnboarding();
			toast.success('Welcome to GetAISEO!');
			router.push('/dashboard');
		} catch (error) {
			console.error('Failed to complete onboarding:', error);
			toast.error('Failed to complete onboarding. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
			<div className="w-full max-w-2xl">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
						<Sparkles className="h-8 w-8 text-blue-600" />
					</div>
					<h1 className="text-3xl font-bold text-gray-900">Welcome{user?.firstName ? `, ${user.firstName}` : ''}!</h1>
					<p className="text-gray-600 mt-2">Let&apos;s set up your account in just a few steps</p>
				</div>

				{/* Progress Steps */}
				<div className="mb-8">
					<div className="flex items-center justify-between">
						{STEPS.map((step, index) => (
							<div key={step.id} className="flex items-center">
								<div className="flex flex-col items-center">
									<div
										className={cn(
											'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all',
											currentStep > step.id
												? 'bg-green-500 text-white'
												: currentStep === step.id
													? 'bg-blue-600 text-white'
													: 'bg-gray-200 text-gray-500'
										)}
									>
										{currentStep > step.id ? (
											<CheckCircle2 className="h-5 w-5" />
										) : (
											step.id
										)}
									</div>
									<span className="text-xs mt-2 text-gray-600 hidden sm:block">{step.title}</span>
								</div>
								{index < STEPS.length - 1 && (
									<div
										className={cn(
											'h-1 w-16 sm:w-24 mx-2 rounded transition-all',
											currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
										)}
									/>
								)}
							</div>
						))}
					</div>
				</div>

				{/* Step Content */}
				<Card className="shadow-lg">
					{/* Step 1: Enter Website URL */}
					{currentStep === 1 && (
						<>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Globe className="h-5 w-5 text-blue-600" />
									Enter Your Website URL
								</CardTitle>
								<CardDescription>
									We&apos;ll analyze your website to provide personalized SEO recommendations
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleSubmitWebsite} className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="websiteUrl">Website URL</Label>
										<Input
											id="websiteUrl"
											type="text"
											placeholder="https://example.com"
											value={websiteUrl}
											onChange={(e) => setWebsiteUrl(e.target.value)}
											className="text-lg"
											disabled={isSubmitting}
										/>
										<p className="text-sm text-gray-500">
											Enter the full URL of your website including https://
										</p>
									</div>
									<Button
										type="submit"
										className="w-full"
										size="lg"
										disabled={isSubmitting || !websiteUrl.trim()}
									>
										{isSubmitting ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Submitting...
											</>
										) : (
											'Continue'
										)}
									</Button>
								</form>
							</CardContent>
						</>
					)}

					{/* Step 2: Analyzing Website */}
					{currentStep === 2 && (
						<>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
									Analyzing Your Website
								</CardTitle>
								<CardDescription>
									Please wait while we analyze your website and its pages
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="space-y-2">
									<div className="flex justify-between text-sm">
										<span className="text-gray-600">Overall Progress</span>
										<span className="font-medium">{Math.round(scrapingProgress)}%</span>
									</div>
									<Progress value={scrapingProgress} className="h-3" />
								</div>

								{/* Page scraping stats */}
								{pageStats && pageStats.total > 0 && (
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
										<div className="flex items-center gap-2 mb-3">
											<FileText className="h-4 w-4 text-blue-600" />
											<span className="font-medium text-blue-900">Scraping Internal Pages</span>
										</div>
										<div className="grid grid-cols-3 gap-4 text-center">
											<div>
												<p className="text-2xl font-bold text-blue-600">{pageStats.total}</p>
												<p className="text-xs text-gray-600">Pages Found</p>
											</div>
											<div>
												<p className="text-2xl font-bold text-green-600">{pageStats.completed}</p>
												<p className="text-xs text-gray-600">Completed</p>
											</div>
											<div>
												<p className="text-2xl font-bold text-orange-600">{pageStats.pending}</p>
												<p className="text-xs text-gray-600">In Progress</p>
											</div>
										</div>
									</div>
								)}

								<div className="bg-gray-50 rounded-lg p-4 space-y-3">
									<div className="flex items-center gap-2 text-sm">
										<CheckCircle2 className={cn(
											'h-4 w-4',
											scrapingProgress >= 10 ? 'text-green-500' : 'text-gray-300'
										)} />
										<span className={scrapingProgress >= 10 ? 'text-gray-700' : 'text-gray-400'}>
											Connecting to website...
										</span>
									</div>
									<div className="flex items-center gap-2 text-sm">
										<CheckCircle2 className={cn(
											'h-4 w-4',
											scrapingProgress >= 30 ? 'text-green-500' : 'text-gray-300'
										)} />
										<span className={scrapingProgress >= 30 ? 'text-gray-700' : 'text-gray-400'}>
											Analyzing main page content...
										</span>
									</div>
									<div className="flex items-center gap-2 text-sm">
										<CheckCircle2 className={cn(
											'h-4 w-4',
											scrapingProgress >= 40 ? 'text-green-500' : 'text-gray-300'
										)} />
										<span className={scrapingProgress >= 40 ? 'text-gray-700' : 'text-gray-400'}>
											Discovering internal pages...
										</span>
									</div>
									<div className="flex items-center gap-2 text-sm">
										{scrapingProgress >= 40 && scrapingProgress < 90 ? (
											<Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
										) : (
											<CheckCircle2 className={cn(
												'h-4 w-4',
												scrapingProgress >= 90 ? 'text-green-500' : 'text-gray-300'
											)} />
										)}
										<span className={scrapingProgress >= 40 ? 'text-gray-700' : 'text-gray-400'}>
											Scraping internal pages {pageStats ? `(${pageStats.completed}/${pageStats.total})` : ''}...
										</span>
									</div>
									<div className="flex items-center gap-2 text-sm">
										<CheckCircle2 className={cn(
											'h-4 w-4',
											scrapingProgress >= 95 ? 'text-green-500' : 'text-gray-300'
										)} />
										<span className={scrapingProgress >= 95 ? 'text-gray-700' : 'text-gray-400'}>
											Finalizing analysis...
										</span>
									</div>
								</div>

								<p className="text-center text-sm text-gray-500">
									{pageStats && pageStats.total > 0
										? `Analyzing ${pageStats.total} pages. This may take a few minutes...`
										: 'This usually takes 30 seconds to a few minutes depending on your website size'}
								</p>
							</CardContent>
						</>
					)}

					{/* Step 3: Complete */}
					{currentStep === 3 && (
						<>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<CheckCircle2 className="h-5 w-5 text-green-500" />
									Analysis Complete!
								</CardTitle>
								<CardDescription>
									Your website has been analyzed successfully
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								{website && (
									<div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
										<div className="flex items-start gap-3">
											{website.scrapedMeta?.favicon ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img
													src={website.scrapedMeta.favicon}
													alt="Favicon"
													className="w-8 h-8 rounded"
												/>
											) : (
												<Globe className="w-8 h-8 text-gray-400" />
											)}
											<div className="flex-1 min-w-0">
												<h3 className="font-semibold text-gray-900 truncate">
													{website.websiteName || website.websiteUrl}
												</h3>
												<p className="text-sm text-gray-600 line-clamp-2">
													{website.websiteDescription || 'No description available'}
												</p>
											</div>
										</div>

										{/* Page scraping summary */}
										{(website.totalPagesScraped && website.totalPagesScraped > 0) && (
											<div className="pt-2 border-t border-green-200">
												<div className="flex items-center gap-2 text-sm">
													<FileText className="h-4 w-4 text-green-600" />
													<span className="text-gray-700">
														<strong>{website.totalPagesScraped}</strong> pages analyzed
														{website.totalPagesFound && website.totalPagesFound > website.totalPagesScraped && (
															<span className="text-gray-500"> of {website.totalPagesFound} found</span>
														)}
													</span>
												</div>
											</div>
										)}

										{website.scrapedMeta?.keywords && website.scrapedMeta.keywords.length > 0 && (
											<div className="pt-2 border-t border-green-200">
												<p className="text-xs text-gray-500 mb-2">Keywords detected:</p>
												<div className="flex flex-wrap gap-1">
													{website.scrapedMeta.keywords.slice(0, 5).map((keyword, index) => (
														<span
															key={index}
															className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
														>
															{keyword}
														</span>
													))}
												</div>
											</div>
										)}
									</div>
								)}

								<div className="space-y-3">
									<Button
										onClick={handleCompleteOnboarding}
										className="w-full"
										size="lg"
										disabled={isSubmitting}
									>
										{isSubmitting ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Getting Started...
											</>
										) : (
											<>
												<Sparkles className="mr-2 h-4 w-4" />
												Go to Dashboard
											</>
										)}
									</Button>
								</div>
							</CardContent>
						</>
					)}
				</Card>

				{/* Footer Note */}
				<p className="text-center text-sm text-gray-500 mt-6">
					You can add more websites later from your dashboard settings
				</p>
			</div>
		</div>
	);
}
