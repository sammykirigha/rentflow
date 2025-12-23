import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from '@/components/providers';

import 'react-toastify/dist/ReactToastify.css';
import "./globals.css";
import { cn } from '@/lib/utils';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MasomoAI - AI Homework Helper for Quick, Accurate, and Stress-Free Solutions",
  description: "Get instant help with your homework across all subjects. Our AI-powered platform provides step-by-step solutions, explanations, and expert guidance to help you succeed academically.",
  keywords: "homework help, AI tutor, study assistance, academic support, math solver, essay writer, online learning",
  authors: [{ name: "MasomoAI Team" }],
  creator: "MasomoAI",
  publisher: "MasomoAI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://MasomoAI.com"),
  openGraph: {
    title: "MasomoAI - AI Homework Helper",
    description: "Get instant, accurate homework help across all subjects with our AI-powered platform.",
    url: "https://MasomoAI.com",
    siteName: "MasomoAI",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "MasomoAI - AI Homework Helper",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MasomoAI - AI Homework Helper",
    description: "Get instant, accurate homework help across all subjects with our AI-powered platform.",
    images: ["/og-image.jpg"],
    creator: "@MasomoAI",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn('light', inter.variable)} suppressContentEditableWarning suppressHydrationWarning>
      <body
        suppressContentEditableWarning
        suppressHydrationWarning
        className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
