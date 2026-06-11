'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useTickets } from '../../../context/TicketContext';
import { Sidebar } from '../../../components/layout/Sidebar';
import { Header } from '../../../components/layout/Header';
import { TicketDetailsView } from '../../../components/tickets/TicketDetailsView';
import TicketDetailLoading from './loading';

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { tickets, fetchTicketById } = useTickets();
  const router = useRouter();
  
  const ticketId = Array.isArray(id) ? id[0] : id;

  const [localLoading, setLocalLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  if (fetchError) {
    throw fetchError;
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    let active = true;
    if (!ticketId || authLoading || !user) return;
    
    const load = async () => {
      try {
        const found = tickets.find((t) => t.id === ticketId || t.id === decodeURIComponent(ticketId));
        if (found) {
          if (active) setLocalLoading(false);
        } else if (fetchTicketById) {
          await fetchTicketById(decodeURIComponent(ticketId));
          if (active) setLocalLoading(false);
        } else {
          if (active) setLocalLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setFetchError(err instanceof Error ? err : new Error(err?.message || 'Database load failure.'));
          setLocalLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [ticketId, tickets, fetchTicketById, authLoading, user]);

  if (authLoading || localLoading) {
    return (
      <div className="flex min-h-screen bg-zinc-50 text-[#09090b]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
            <TicketDetailLoading />
          </main>
        </div>
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

