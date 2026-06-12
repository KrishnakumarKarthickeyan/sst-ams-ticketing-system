'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Mail, Phone, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { toast } from 'sonner';

interface ContactItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  designation: string;
  is_primary: boolean;
  is_secondary: boolean;
}

export default function CustomerContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);

  const userOrg = user?.company || 'Apex Global Industries';

  useEffect(() => {
    const fetchOrgContacts = async () => {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        try {
          // 1. Fetch contact IDs tagged to this organization
          const { data: tags, error: tagsErr } = await supabase
            .from('organization_contact_tags')
            .select('contact_id')
            .eq('organization_name', userOrg);

          if (tagsErr) throw tagsErr;

          if (tags && tags.length > 0) {
            const contactIds = tags.map(t => t.contact_id);

            // 2. Fetch contact details
            const { data: contactsData, error: contactsErr } = await supabase
              .from('organization_contacts')
              .select('*')
              .in('id', contactIds)
              .order('name');

            if (contactsErr) throw contactsErr;

            setContacts(contactsData || []);
          } else {
            setContacts([]);
          }
        } catch (err: any) {
          console.error('Error fetching customer organization contacts:', err);
          toast.error(`Failed to load directory: ${err.message}`);
        } finally {
          setLoading(false);
        }
      } else {
        // Local fallback
        const mockAll = [
          { id: 'c-1', name: 'John Miller', email: 'john.miller@apex.com', phone: '+1 (555) 0142', designation: 'IT Manager', is_primary: true, is_secondary: false, organizationName: 'Apex Global Industries' },
          { id: 'c-2', name: 'Keerthana Rajan', email: 'keerthana@assist360.com', phone: '+91 98765 43210', designation: 'Primary Lead', is_primary: false, is_secondary: true, organizationName: 'Apex Global Industries' }
        ];
        const filtered = mockAll.filter(c => c.organizationName.toLowerCase() === userOrg.toLowerCase());
        setContacts(filtered);
        setLoading(false);
      }
    };

    fetchOrgContacts();
  }, [userOrg, user?.id]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-xs text-ink-secondary">
        Loading organization contacts...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between border-b border-line pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink uppercase">
            Organization Contacts
          </h1>
          <p className="text-xs text-ink-secondary font-medium">
            Authorized support personnel and ticket requesters for <span className="font-bold text-ink">{userOrg}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-secondary bg-surface-subtle border border-line px-3 py-1.5 rounded-lg">
          <Users size={14} className="text-ink-muted" />
          <span>Total Authorized: {contacts.length}</span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {contacts.map((contact) => (
          <Card key={contact.id} className="border-line hover:border-line-strong transition-all duration-200 relative overflow-hidden bg-surface shadow-card flex flex-col justify-between">
            {contact.is_primary && (
              <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none">
                <div className="bg-ink text-white text-[11px] font-bold py-1 text-center w-[150px] absolute top-4 -right-10 rotate-45 border-b border-zinc-800">
                  PRIMARY
                </div>
              </div>
            )}
            
            <CardHeader className="space-y-1.5 pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm tracking-tight text-ink">
                    {contact.name}
                  </h3>
                  <p className="text-[11px] font-semibold text-ink-secondary tracking-wide uppercase">
                    {contact.designation}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-ink-secondary">
                  <Mail size={13} className="text-ink-muted" />
                  <a href={`mailto:${contact.email}`} className="hover:underline font-medium hover:text-ink truncate max-w-[200px]">
                    {contact.email}
                  </a>
                </div>
                {contact.phone && (
                  <div className="flex items-center gap-2 text-ink-secondary">
                    <Phone size={13} className="text-ink-muted" />
                    <a href={`tel:${contact.phone}`} className="hover:underline font-medium hover:text-ink">
                      {contact.phone}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-line">
                {contact.is_primary ? (
                  <Badge className="bg-ink text-white text-[11px] tracking-wider flex items-center gap-1 rounded py-0.5 px-1.5 hover:bg-ink border-0 h-5">
                    <ShieldCheck size={11} />
                    <span>Primary Support</span>
                  </Badge>
                ) : contact.is_secondary ? (
                  <Badge className="bg-surface-subtle text-ink border-line text-[11px] tracking-wider flex items-center gap-1 rounded py-0.5 px-1.5 hover:bg-surface-subtle h-5">
                    <UserCheck size={11} className="text-ink-secondary" />
                    <span>Secondary Contact</span>
                  </Badge>
                ) : (
                  <Badge className="bg-surface-muted text-ink-secondary border-line text-[11px] tracking-wider flex items-center gap-1 rounded py-0.5 px-1.5 hover:bg-surface-muted h-5">
                    <span>Authorized Requester</span>
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {contacts.length === 0 && (
          <div className="col-span-full border border-dashed border-line-strong rounded-lg p-12 text-center bg-surface-muted">
            <Users className="mx-auto h-8 w-8 text-ink-muted" />
            <h3 className="mt-2 text-xs font-bold text-ink">No Contacts Found</h3>
            <p className="mt-1 text-xs text-ink-secondary">
              There are no registered support contacts mapped to your organization.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
