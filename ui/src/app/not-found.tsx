"use client";

import { Button } from "@/components/ui/button";
import { DotPattern } from '@/components/ui/dot-pattern';
import { cn } from '@/lib/utils';
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
	return (
		<div className="bg-background relative  min-h-screen w-full overflow-hidden rounded-lg">
			<DotPattern
				className={cn(
					"mask-[radial-gradient(1000px_circle_at_center,white,transparent)]"
				)}
				glow={true}
			/>
			<div className="w-full flex min-h-[60vh] items-center justify-center py-12 px-4">
				<div className="max-w-md w-full text-center">
					<div className="mb-8">
						<h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
						<h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
						<p className="text-gray-600">
							The page you&apos;re looking for doesn&apos;t exist.
						</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Button
							variant="outline"
							onClick={() => window.history.back()}
							className="flex items-center"
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Go Back
						</Button>
						<Link href="/dashboard">
							<Button className="flex items-center">
								<Home className="h-4 w-4 mr-2" />
								Home
							</Button>
						</Link>
					</div>
				</div>
			</div>
		</div >
	);
}