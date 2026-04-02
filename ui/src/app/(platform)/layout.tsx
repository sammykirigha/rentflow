import ProtectedRoute from "@/components/ProtectedRoute";
import { getCurrentUser } from '@/lib/session';
import type { Metadata } from "next";
import { redirect } from 'next/navigation';
import { PropsWithChildren } from 'react';
import PlatformLayoutShell from './platform-layout-shell';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PlatformLayout({ children }: PropsWithChildren) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return redirect('/login');
  }

  const roleName = (currentUser as unknown as Record<string, unknown>).roleName as string;
  if (roleName !== 'SUPER_ADMIN') {
    return redirect('/dashboard');
  }

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      <PlatformLayoutShell>{children}</PlatformLayoutShell>
    </ProtectedRoute>
  );
}
