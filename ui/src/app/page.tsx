import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import LandingPage from '@/components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'RentFlow - Automated Rent Collection for Kenyan Landlords',
  description:
    'RentFlow automates invoicing, tracks rent payments via M-Pesa Paybill, and manages your entire property portfolio. Built for Kenyan landlords and property managers.',
  keywords: [
    'rent collection',
    'M-Pesa',
    'property management',
    'Kenya',
    'landlord',
    'invoicing',
    'tenant management',
    'rental property',
    'Paybill',
    'RentFlow',
  ],
  openGraph: {
    title: 'RentFlow - Automated Rent Collection with M-Pesa',
    description:
      'Automate invoicing, track M-Pesa payments, and manage your rental properties from one dashboard. Built for Kenyan landlords.',
    locale: 'en_KE',
    type: 'website',
    siteName: 'RentFlow',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RentFlow - Automated Rent Collection with M-Pesa',
    description:
      'Automate invoicing, track M-Pesa payments, and manage your rental properties from one dashboard.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    const roleName = (user as unknown as Record<string, unknown>).roleName as string | undefined;
    if (roleName === 'TENANT') {
      redirect('/tenant/invoices');
    } else {
      redirect('/dashboard');
    }
  }

  return <LandingPage />;
}
