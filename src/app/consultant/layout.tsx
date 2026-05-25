'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';

export default function ConsultantLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'Consultant' && user.role !== 'SuperAdmin') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || (user.role !== 'Consultant' && user.role !== 'SuperAdmin')) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-zinc-950 font-mono text-xs">
        Authenticating Secure Consultant Session...
      </div>
    );
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
