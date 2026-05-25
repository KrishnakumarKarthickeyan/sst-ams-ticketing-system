'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { TicketDetailsView } from '../../../../components/tickets/TicketDetailsView';

export default function AdminTicketDetailPage() {
  const { id } = useParams();
  const ticketId = Array.isArray(id) ? id[0] : id;

  if (!ticketId) return null;

  return (
    <div className="space-y-4">
      <TicketDetailsView ticketId={ticketId} role="SuperAdmin" />
    </div>
  );
}
