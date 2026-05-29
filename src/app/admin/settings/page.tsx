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
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono">Platform Configurations</h1>
        <p className="text-zinc-500 mt-1">Audit active API connections, verify RLS settings, or re-initialize client storage.</p>
      </div>

      {success && (
        <div className="bg-zinc-50 border border-zinc-900 rounded p-3 text-zinc-900 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
          <Check size={14} />
          Local storage state re-seeded with mock database profiles
        </div>
      )}

      {/* Connection state */}
      <div className="bg-white border border-zinc-200 rounded p-5 space-y-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950 border-b border-zinc-150 pb-2 flex items-center justify-between">
          <span>Backend Link Status</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isSupabaseConfigured ? 'bg-zinc-950 text-white animate-pulse' : 'bg-zinc-100 text-zinc-400'}`}>
            {isSupabaseConfigured ? 'LIVE INTEGRATION' : 'LOCAL FALLBACK'}
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold uppercase block">API Endpoints URL:</span>
            <span className="font-mono text-zinc-700 block select-all">
              {isSupabaseConfigured ? process.env.NEXT_PUBLIC_SUPABASE_URL : 'https://localfallback.sst.internal'}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold uppercase block">Row Level Security Compliance:</span>
            <span className="font-bold text-zinc-700 block uppercase">
              {isSupabaseConfigured ? 'ENFORCED (SCHEMA LEVEL)' : 'SIMULATED (STATE CONTEXTS)'}
            </span>
          </div>
        </div>
      </div>

      {/* Reset Operations */}
      <div className="bg-white border border-zinc-200 rounded p-5 space-y-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950 border-b border-zinc-150 pb-2">
          Platform Data Diagnostics
        </h3>
        <p className="text-zinc-500 leading-normal max-w-xl">
          {isSupabaseConfigured
            ? 'Local storage state seeding is disabled when Supabase is active as the single source of truth.'
            : 'Resetting database states empties local edits and re-populates default organizations, tickets, efforts, and categories.'}
        </p>

        {!isSupabaseConfigured && (
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-zinc-900 hover:bg-zinc-950 hover:text-white rounded font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition disabled:opacity-50"
            disabled={resetting}
          >
            <RefreshCw size={12} className={resetting ? 'animate-spin' : ''} />
            {resetting ? 'Seeding Local Database...' : 'Re-Seed Local Storage'}
          </button>
        )}
      </div>

      {/* Diagnostics Panel */}
      <div className="p-5 border border-zinc-200 rounded bg-zinc-50 flex items-start gap-3">
        <ShieldAlert size={16} className="text-zinc-500 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-normal">
          <h4 className="font-bold text-zinc-950">Invitation Only Registrations</h4>
          <p className="text-zinc-500">
            Platform accounts must be provisioned inside user settings. Direct client-side registrations are blocked.
          </p>
        </div>
      </div>
    </div>
  );
}
