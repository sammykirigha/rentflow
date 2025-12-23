import ProtectedRoute from "@/components/ProtectedRoute";
import { getCurrentUser } from '@/lib/session';
import type { Metadata } from "next";
import { redirect } from 'next/navigation';
import { PropsWithChildren } from 'react';
;

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Layout({ children }: PropsWithChildren) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return redirect('/login');
  }

  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}