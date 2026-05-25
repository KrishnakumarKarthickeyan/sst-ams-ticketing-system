'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ConsultantTicketDetailsView } from '../../../../components/tickets/ConsultantTicketDetailsView';

export default function ConsultantTicketDetailPage() {
  const { id } = useParams();
  const ticketId = Array.isArray(id) ? id[0] : id;

  if (!ticketId) return null;

  return (
    <div className="space-y-4">
      <ConsultantTicketDetailsView ticketId={ticketId} />
    </div>
  );
}
