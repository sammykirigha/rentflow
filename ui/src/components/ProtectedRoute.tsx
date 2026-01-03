'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireOnboarding?: boolean;
}

export default function ProtectedRoute({ children, allowedRoles, requireOnboarding = true }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if user needs to complete onboarding
    if (!loading && isAuthenticated && user && requireOnboarding) {
      // Don't redirect if already on onboarding page
      if (!user.isOnboarded && !pathname?.startsWith('/onboarding')) {
        router.push('/onboarding');
        return;
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, user, allowedRoles, pathname, requireOnboarding]);



  if (!isAuthenticated) {
    return null;
  }

  // Don't render children if user needs onboarding (unless on onboarding page)
  if (requireOnboarding && user && !user.isOnboarded && !pathname?.startsWith('/onboarding')) {
    return null;
  }

  return <>{children}</>;
}