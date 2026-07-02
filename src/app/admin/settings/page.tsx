'use client';

import React, { useState } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { ShieldAlert, Check, RefreshCw, Database, Server, Settings as SettingsIcon } from 'lucide-react';
import { AdminPageHeader, AdminCard, AdminButton, AdminPill } from '../../../components/admin/ui/admin-kit';

export default function AdminSettingsPage() {
  const { resetMockData } = useTickets();
  const [resetting, setResetting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = () => {
    setResetting(true);
    setTimeout(() => {
      resetMockData();
      setResetting(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={<><SettingsIcon size={13} strokeWidth={2} /> Platform</>}
        title="Platform Configurations"
        subtitle="Audit active API connections, verify RLS posture, or re-initialize local storage."
      />

      {success && (
        <div className="ak-banner" style={{ borderColor: 'var(--ak-success)', background: 'rgba(15,122,79,.06)' }}>
          <div className="flex items-center gap-3">
            <span className="ak-banner-icon" style={{ background: 'rgba(15,122,79,.12)', color: 'var(--ak-success)' }}><Check size={16} /></span>
            <div><span className="ak-banner-title" style={{ color: 'var(--ak-success)' }}>Local storage re-seeded</span>
              <span className="ak-banner-sub">Mock database profiles were restored.</span></div>
          </div>
        </div>
      )}

      <AdminCard
        title="Backend Link Status"
        actions={<AdminPill tone={isSupabaseConfigured ? 'ok' : 'muted'}>{isSupabaseConfigured ? 'Live integration' : 'Local fallback'}</AdminPill>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ak-ink3)', display: 'flex', alignItems: 'center', gap: 5 }}><Server size={12} /> API Endpoint</span>
            <span className="select-all" style={{ color: 'var(--ak-ink2)', fontSize: 12.5, display: 'block', marginTop: 4, wordBreak: 'break-all' }}>
              {isSupabaseConfigured ? process.env.NEXT_PUBLIC_SUPABASE_URL : 'https://localfallback.assist360.internal'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ak-ink3)', display: 'flex', alignItems: 'center', gap: 5 }}><ShieldAlert size={12} /> Row-Level Security</span>
            <span style={{ color: 'var(--ak-ink2)', fontSize: 12.5, fontWeight: 600, display: 'block', marginTop: 4 }}>
              {isSupabaseConfigured ? 'Enforced (schema level)' : 'Simulated (state contexts)'}
            </span>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Platform Data Diagnostics" desc={isSupabaseConfigured
        ? 'Local seeding is disabled while Supabase is the single source of truth.'
        : 'Resetting empties local edits and re-populates default orgs, tickets, efforts, and categories.'}>
        {!isSupabaseConfigured && (
          <AdminButton variant="ghost" onClick={handleReset} disabled={resetting}>
            <RefreshCw size={12} className={resetting ? 'animate-spin' : ''} />
            {resetting ? 'Seeding local database…' : 'Re-seed local storage'}
          </AdminButton>
        )}
      </AdminCard>

      <div className="ak-alert" style={{ alignItems: 'flex-start' }}>
        <span style={{ display: 'flex', gap: 10 }}>
          <ShieldAlert size={16} style={{ color: 'var(--ak-ink3)', flex: 'none', marginTop: 2 }} />
          <span>
            <span className="ak-alert-title">Invitation-only registrations</span>
            <span className="ak-alert-sub">Accounts are provisioned in User settings. Direct client-side registration is blocked.</span>
          </span>
        </span>
      </div>
    </div>
  );
}
