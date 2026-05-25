'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Sidebar } from '../../../components/layout/Sidebar';
import { Header } from '../../../components/layout/Header';
import { TicketDetailsView } from '../../../components/tickets/TicketDetailsView';

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const ticketId = Array.isArray(id) ? id[0] : id;

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-zinc-950 font-mono text-xs">
        Validating Portal Session...
      </div>
    );
  }

  if (!user || !ticketId) {
    return null;
  }

  // Determine user role and load correct workspace view
  const mapRole = (role: string) => {
    switch (role) {
      case 'SuperAdmin': return 'SuperAdmin';
      case 'Manager': return 'Manager';
      case 'Consultant': return 'Consultant';
      case 'Customer': return 'Customer';
      default: return 'Customer';
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 text-[#09090b]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          <TicketDetailsView ticketId={ticketId} role={mapRole(user.role)} />
        </main>
      </div>
    </div>
  );
}
