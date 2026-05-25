'use client';

import React from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Mail, Phone, ShieldCheck, UserCheck, Users } from 'lucide-react';

export default function CustomerContactsPage() {
  const { user } = useAuth();
  const { contacts, loading } = useTickets();

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center font-mono text-xs text-zinc-500">
        Loading organization contacts...
      </div>
    );
  }

  // Filter contacts by user's organization
  const userOrg = user?.company || 'Apex Global Industries';
  const orgContacts = contacts.filter(
    (c) => c.organizationName.toLowerCase() === userOrg.toLowerCase()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight font-mono text-zinc-950 uppercase">
            Organization Contacts
          </h1>
          <p className="text-xs text-zinc-500 font-medium">
            Authorized support personnel and ticket requesters for <span className="font-bold text-zinc-800">{userOrg}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg">
          <Users size={14} className="text-zinc-400" />
          <span>Total Authorized: {orgContacts.length}</span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {orgContacts.map((contact) => (
          <Card key={contact.id} className="border-zinc-200 hover:border-zinc-400 transition-all duration-200 relative overflow-hidden bg-white shadow-sm flex flex-col justify-between">
            {contact.isPrimary && (
              <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none">
                <div className="bg-zinc-950 text-white font-mono text-[9px] font-bold py-1 text-center w-[150px] absolute top-4 -right-10 rotate-45 border-b border-zinc-800">
                  PRIMARY
                </div>
              </div>
            )}
            
            <CardHeader className="space-y-1.5 pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm tracking-tight text-zinc-950 font-mono">
                    {contact.name}
                  </h3>
                  <p className="text-[11px] font-semibold text-zinc-500 tracking-wide uppercase">
                    {contact.designation}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-zinc-600">
                  <Mail size={13} className="text-zinc-400" />
                  <a href={`mailto:${contact.email}`} className="hover:underline font-medium hover:text-zinc-950 truncate max-w-[200px]">
                    {contact.email}
                  </a>
                </div>
                {contact.phone && (
                  <div className="flex items-center gap-2 text-zinc-600">
                    <Phone size={13} className="text-zinc-400" />
                    <a href={`tel:${contact.phone}`} className="hover:underline font-medium hover:text-zinc-950 font-mono">
                      {contact.phone}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-100">
                {contact.isPrimary ? (
                  <Badge className="bg-zinc-950 text-white text-[9px] font-mono tracking-wider flex items-center gap-1 rounded py-0.5 px-1.5 hover:bg-zinc-900 border-0">
                    <ShieldCheck size={10} />
                    <span>Primary Support</span>
                  </Badge>
                ) : contact.isSecondary ? (
                  <Badge className="bg-zinc-100 text-zinc-800 border-zinc-200 text-[9px] font-mono tracking-wider flex items-center gap-1 rounded py-0.5 px-1.5 hover:bg-zinc-100">
                    <UserCheck size={10} className="text-zinc-500" />
                    <span>Secondary Contact</span>
                  </Badge>
                ) : (
                  <Badge className="bg-zinc-50 text-zinc-500 border-zinc-200 text-[9px] font-mono tracking-wider flex items-center gap-1 rounded py-0.5 px-1.5 hover:bg-zinc-50">
                    <span>Authorized Requester</span>
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {orgContacts.length === 0 && (
          <div className="col-span-full border border-dashed border-zinc-300 rounded-xl p-12 text-center bg-zinc-50">
            <Users className="mx-auto h-8 w-8 text-zinc-400" />
            <h3 className="mt-2 text-xs font-bold text-zinc-900 font-mono">No Contacts Found</h3>
            <p className="mt-1 text-xs text-zinc-500">
              There are no registered support contacts mapped to your organization.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
