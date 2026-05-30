'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTickets } from '../../../../context/TicketContext';
import { ConsultantTicketDetailsView } from '../../../../components/tickets/ConsultantTicketDetailsView';
import ConsultantTicketDetailLoading from './loading';

export default function ConsultantTicketDetailPage() {
  const { id } = useParams();
  const { tickets, fetchTicketById } = useTickets();
  const ticketId = Array.isArray(id) ? id[0] : id;

  const [localLoading, setLocalLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  if (fetchError) {
    throw fetchError;
  }

  useEffect(() => {
    let active = true;
    if (!ticketId) return;

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
  }, [ticketId, tickets, fetchTicketById]);

  if (!ticketId) return null;

  if (localLoading) {
    return <ConsultantTicketDetailLoading />;
  }

  return (
    <div className="space-y-4">
      <ConsultantTicketDetailsView ticketId={ticketId} />
    </div>
  );
}

