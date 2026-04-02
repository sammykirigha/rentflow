'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Spin } from 'antd';
import { useSession } from 'next-auth/react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check mustChangePassword — redirect unless already on change-password page
    if (!loading && isAuthenticated && session) {
      const mustChange = (session.user as unknown as Record<string, unknown>)?.mustChangePassword;
      if (mustChange && pathname !== '/change-password') {
        router.push('/change-password');
        return;
      }
    }

    if (!loading && isAuthenticated && user && allowedRoles) {
      const userRoleName = user.userRole?.name;
      if (userRoleName && !allowedRoles.includes(userRoleName)) {
        // Redirect based on role
        if (userRoleName === 'SUPER_ADMIN') {
          router.push('/platform/dashboard');
        } else if (userRoleName === 'ORG_TENANT' || userRoleName === 'TENANT') {
          router.push('/tenant');
        } else {
          router.push('/dashboard');
        }
      }
    }
  }, [loading, isAuthenticated, user, allowedRoles, router, session, pathname]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Don't render children while mustChangePassword redirect is pending
  const mustChange = (session?.user as unknown as Record<string, unknown>)?.mustChangePassword;
  if (mustChange && pathname !== '/change-password') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
}
