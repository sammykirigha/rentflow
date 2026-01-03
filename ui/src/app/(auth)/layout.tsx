
import { DotPattern } from '@/components/ui/dot-pattern';
import { cn } from '@/lib/utils';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: 'Masomo Dash Kenya - Quality Educational Materials',
    template: '%s | Masomo Dash Kenya'
  },
  description: 'Browse thousands of quality exam papers, marking schemes for CBC, IGCSE, IB curricula. Trusted by 5000+ teachers across Kenya.',
  keywords: ['exam papers Kenya', 'CBC past papers', 'IGCSE marking schemes', 'teacher resources', 'educational materials'],
  authors: [{ name: 'Masomo Dash' }],
  openGraph: {
    title: 'Masomo Dash Kenya',
    description: 'Quality educational materials from verified teachers',
    url: 'https://masomodash.co.ke',
    siteName: 'Masomo Dash',
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Masomo Dash Kenya',
    description: 'Quality educational materials from verified teachers',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://masomodash.co.ke',
  },
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <DotPattern
        className={cn(
          "mask-[radial-gradient(1000px_circle_at_center,white,transparent)]"
        )}
        glow={true}
      />

      <main>{children}</main>
    </div>
  );
}