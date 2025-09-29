'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const publicRoutes = ['/', '/login'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    const checkAuth = () => {
      // Check both localStorage and sessionStorage for auth
      const localAuth = localStorage.getItem('meridian-auth');
      const sessionAuth = sessionStorage.getItem('meridian-auth');
      
      const authenticated = localAuth === 'authenticated' || sessionAuth === 'authenticated';
      setIsAuthenticated(authenticated);
      
      // Redirect logic
      if (!authenticated && !isPublicRoute) {
        router.push('/login');
      } else if (authenticated && pathname === '/login') {
        router.push('/dashboard');
      }
    };

    checkAuth();
  }, [pathname, router, isPublicRoute]);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Meridian Writer...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and trying to access protected route, don't render children
  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  // If authenticated and on login page, don't render children (will redirect)
  if (isAuthenticated && pathname === '/login') {
    return null;
  }

  return <>{children}</>;
}

// Hook to logout
export function useAuth() {
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem('meridian-auth');
    sessionStorage.removeItem('meridian-auth');
    router.push('/login');
  };

  const isAuthenticated = () => {
    if (typeof window === 'undefined') return false;
    const localAuth = localStorage.getItem('meridian-auth');
    const sessionAuth = sessionStorage.getItem('meridian-auth');
    return localAuth === 'authenticated' || sessionAuth === 'authenticated';
  };

  return { logout, isAuthenticated };
}