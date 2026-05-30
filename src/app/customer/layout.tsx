'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { Skeleton } from '../../components/ui/skeleton';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'Customer' && user.role !== 'SuperAdmin') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-zinc-50 text-[#09090b]">
        {/* Skeleton Sidebar */}
        <aside className="w-64 bg-zinc-950 text-zinc-400 p-6 flex flex-col justify-between hidden md:flex shrink-0">
          <div className="space-y-6">
            <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full bg-zinc-800 rounded-md" />
              ))}
            </div>
          </div>
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          {/* Skeleton Header */}
          <header className="h-16 border-b border-zinc-200 bg-white px-6 flex items-center justify-between animate-pulse">
            <Skeleton className="h-6 w-48 bg-zinc-200 rounded" />
            <Skeleton className="h-8 w-24 bg-zinc-200 rounded" />
          </header>
          {/* Skeleton Content */}
          <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6 animate-pulse">
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64 bg-zinc-200" />
                <Skeleton className="h-4 w-96 bg-zinc-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 bg-white border border-zinc-200 rounded-xl p-4 space-y-2 shadow-sm">
                    <Skeleton className="h-4 w-20 bg-zinc-200" />
                    <Skeleton className="h-6 w-12 bg-zinc-200" />
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'Customer' && user.role !== 'SuperAdmin')) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 text-[#09090b]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
