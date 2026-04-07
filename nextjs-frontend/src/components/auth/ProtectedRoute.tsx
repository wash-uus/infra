'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const roles = requiredRole
    ? Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    : null;

  const hasRole = !roles || (!!profile?.role && roles.includes(profile.role));

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
    if (!loading && user && roles && !hasRole) {
      router.replace('/dashboard');
    }
  }, [user, profile, loading, hasRole, router]);

  // Show a spinner during the initial auth check AND while redirecting — this
  // prevents a blank flash caused by rendering null while router.replace is async.
  if (loading || !user || (roles && !hasRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-infra-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
