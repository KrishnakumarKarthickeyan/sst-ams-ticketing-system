'use client';

import React, { useState } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { Activity, ShieldAlert, Check, RefreshCw } from 'lucide-react';

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
    <div className="space-y-6 text-xs text-ink">
      <div className="border-b border-line pb-4">
        <h1 className="type-title text-ink">Platform Configurations</h1>
        <p className="type-meta mt-1 text-ink-secondary">Audit active API connections, verify RLS settings, or re-initialize client storage.</p>
      </div>

      {success && (
        <div className="bg-surface-muted border border-zinc-900 rounded p-3 text-ink font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Check size={14} />
          Local storage state re-seeded with mock database profiles
        </div>
      )}

      {/* Connection state */}
      <div className="bg-surface border border-line rounded p-5 space-y-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-ink border-b border-line pb-2 flex items-center justify-between">
          <span>Backend Link Status</span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isSupabaseConfigured ? 'bg-ink text-white animate-pulse' : 'bg-surface-subtle text-ink-muted'}`}>
            {isSupabaseConfigured ? 'LIVE INTEGRATION' : 'LOCAL FALLBACK'}
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[11px] text-ink-muted font-bold uppercase block">API Endpoints URL:</span>
            <span className="text-ink-secondary block select-all">
              {isSupabaseConfigured ? process.env.NEXT_PUBLIC_SUPABASE_URL : 'https://localfallback.assist360.internal'}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-ink-muted font-bold uppercase block">Row Level Security Compliance:</span>
            <span className="font-bold text-ink-secondary block uppercase">
              {isSupabaseConfigured ? 'ENFORCED (SCHEMA LEVEL)' : 'SIMULATED (STATE CONTEXTS)'}
            </span>
          </div>
        </div>
      </div>

      {/* Reset Operations */}
      <div className="bg-surface border border-line rounded p-5 space-y-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-ink border-b border-line pb-2">
          Platform Data Diagnostics
        </h3>
        <p className="text-ink-secondary leading-normal max-w-xl">
          {isSupabaseConfigured
            ? 'Local storage state seeding is disabled when Supabase is active as the single source of truth.'
            : 'Resetting database states empties local edits and re-populates default organizations, tickets, efforts, and categories.'}
        </p>

        {!isSupabaseConfigured && (
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-zinc-900 hover:bg-ink hover:text-white rounded font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition disabled:opacity-50"
            disabled={resetting}
          >
            <RefreshCw size={12} className={resetting ? 'animate-spin' : ''} />
            {resetting ? 'Seeding Local Database...' : 'Re-Seed Local Storage'}
          </button>
        )}
      </div>

      {/* Diagnostics Panel */}
      <div className="p-5 border border-line rounded bg-surface-muted flex items-start gap-3">
        <ShieldAlert size={16} className="text-ink-secondary shrink-0 mt-0.5" />
        <div className="space-y-1 leading-normal">
          <h4 className="font-bold text-ink">Invitation Only Registrations</h4>
          <p className="text-ink-secondary">
            Platform accounts must be provisioned inside user settings. Direct client-side registrations are blocked.
          </p>
        </div>
      </div>
    </div>
  );
}
