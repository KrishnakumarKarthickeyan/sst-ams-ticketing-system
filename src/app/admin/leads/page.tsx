'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Inbox, Sparkles, MessageSquare, CalendarClock } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { StatCard } from '../../../components/ui/stat-card';
import { AdminPageHeader, AdminGrid, AdminStat } from '../../../components/admin/ui/admin-kit';
import { StatusPill, type PillTone } from '../../../components/ui/status-pill';
import { DataTable, type DataTableColumn } from '../../../components/ui/data-table';

interface Lead {
  id: string;
  lead_type: 'waitlist' | 'demo' | 'contact';
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  team_size: string | null;
  message: string | null;
  created_at: string;
}

const TYPE_TONE: Record<string, PillTone> = { waitlist: 'brand', demo: 'info', contact: 'warning' };
const TYPE_LABEL: Record<string, string> = { waitlist: 'Waitlist', demo: 'Demo', contact: 'Contact' };

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'waitlist' | 'demo' | 'contact'>('all');

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isSupabaseConfigured || !supabase) { setLoading(false); return; }
      // RLS (landing_leads_admin_select) already restricts this to Manager/SuperAdmin.
      const { data, error } = await supabase
        .from('landing_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (active) {
        if (!error && data) setLeads(data as Lead[]);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => ({
    total: leads.length,
    waitlist: leads.filter(l => l.lead_type === 'waitlist').length,
    demo: leads.filter(l => l.lead_type === 'demo').length,
    contact: leads.filter(l => l.lead_type === 'contact').length,
  }), [leads]);

  const rows = useMemo(
    () => (typeFilter === 'all' ? leads : leads.filter(l => l.lead_type === typeFilter)),
    [leads, typeFilter]
  );

  const columns: DataTableColumn<Lead>[] = [
    {
      key: 'type', header: 'Type', width: '110px',
      sortValue: l => l.lead_type, exportValue: l => TYPE_LABEL[l.lead_type] ?? l.lead_type,
      render: l => <StatusPill tone={TYPE_TONE[l.lead_type] ?? 'neutral'}>{TYPE_LABEL[l.lead_type] ?? l.lead_type}</StatusPill>,
    },
    {
      key: 'name', header: 'Name', hideable: false, sortValue: l => l.name,
      render: l => (
        <div className="min-w-0">
          <span className="type-meta block font-medium text-ink">{l.name}</span>
          {l.company && <span className="type-status block truncate text-ink-muted">{l.company}</span>}
        </div>
      ),
    },
    {
      key: 'email', header: 'Email', sortValue: l => l.email,
      render: l => <a href={`mailto:${l.email}`} className="type-meta text-brand hover:underline">{l.email}</a>,
    },
    { key: 'phone', header: 'Phone', sortValue: l => l.phone ?? '', render: l => <span className="type-meta text-ink-secondary">{l.phone || '—'}</span> },
    { key: 'team', header: 'Team Size', width: '100px', sortValue: l => l.team_size ?? '', render: l => <span className="type-meta text-ink-secondary">{l.team_size || '—'}</span> },
    {
      key: 'message', header: 'Message', defaultHidden: true, sortValue: l => l.message ?? '',
      render: l => <span className="type-status block max-w-[260px] truncate text-ink-muted" title={l.message || ''}>{l.message || '—'}</span>,
    },
    {
      key: 'received', header: 'Received', width: '150px',
      sortValue: l => new Date(l.created_at).getTime(), exportValue: l => l.created_at,
      render: l => <span className="type-meta type-num text-ink-secondary">{new Date(l.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>,
    },
  ];

  const tabs: { id: typeof typeFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.total },
    { id: 'waitlist', label: 'Waitlist', count: counts.waitlist },
    { id: 'demo', label: 'Demo', count: counts.demo },
    { id: 'contact', label: 'Contact', count: counts.contact },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={<><Inbox size={13} strokeWidth={2} /> Marketing inbound</>}
        title="Inbound Leads"
        subtitle="Waitlist signups, demo requests and contact-sales messages from the marketing site."
      />

      <AdminGrid cols={4}>
        <AdminStat label="Total Leads" value={counts.total} icon={<Inbox size={15} strokeWidth={2} />} sub="all inbound" loading={loading} />
        <AdminStat label="Waitlist" value={counts.waitlist} icon={<Sparkles size={15} strokeWidth={2} />} sub="early access" loading={loading} />
        <AdminStat label="Demo Requests" value={counts.demo} icon={<CalendarClock size={15} strokeWidth={2} />} sub="sales demos" loading={loading} />
        <AdminStat label="Contact Sales" value={counts.contact} tone={counts.contact > 0 ? 'warning' : 'neutral'} icon={<MessageSquare size={15} strokeWidth={2} />} sub="direct enquiries" loading={loading} />
      </AdminGrid>

      <div className="flex max-w-full flex-wrap gap-1 overflow-x-auto rounded-lg border border-line bg-surface-subtle p-1">
        {tabs.map(tab => {
          const active = typeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`type-status flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${active ? 'bg-surface text-ink shadow-card' : 'text-ink-secondary hover:bg-surface/60 hover:text-ink'}`}
            >
              {tab.label}
              <span className={`type-num rounded-full px-1.5 py-0.5 text-[11px] leading-none font-semibold ${active ? 'bg-surface-subtle text-ink' : 'bg-line/60 text-ink-secondary'}`}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      <DataTable<Lead>
        columns={columns}
        rows={rows}
        rowKey={l => l.id}
        loading={loading}
        exportName="assist360-leads"
        pageSize={25}
        emptyIcon={Inbox}
        emptyTitle="No leads yet"
        emptyDescription="Waitlist, demo and contact submissions from the marketing site will appear here."
      />
    </div>
  );
}
