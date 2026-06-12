'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function DashboardRouterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        // Redirection based on role
        switch (user.role) {
          case 'SuperAdmin':
            router.push('/admin/dashboard');
            break;
          case 'Manager':
            router.push('/manager/dashboard');
            break;
          case 'Consultant':
            router.push('/consultant/dashboard');
            break;
          case 'Customer':
            router.push('/customer/dashboard');
            break;
          default:
            router.push('/login');
        }
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface text-ink text-xs">
      <div className="text-center space-y-3">
        <span className="animate-spin inline-block w-4 h-4 border border-ink border-t-transparent rounded-full"></span>
        <p className="tracking-wider">Routing to role dashboard...</p>
      </div>
    </div>
  );
}
