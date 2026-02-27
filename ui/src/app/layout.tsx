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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'RentFlow',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              description:
                'Automated rent collection and property management system for Kenyan landlords. Integrates with M-Pesa for seamless payment tracking.',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'KES',
              },
              featureList: [
                'M-Pesa Paybill integration',
                'Automated monthly invoicing',
                'Tenant wallet system',
                'SMS and email notifications',
                'Expense and maintenance tracking',
                'Multi-property dashboard',
              ],
            }),
          }}
        />
      </head>
      <body suppressContentEditableWarning suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
