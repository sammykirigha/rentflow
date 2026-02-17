import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from '@/components/providers';

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RentFlow - Rental Property Management",
  description: "Rental property management system for automating invoicing, tracking rent payments, and managing tenants.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressContentEditableWarning suppressHydrationWarning>
      <body suppressContentEditableWarning suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
