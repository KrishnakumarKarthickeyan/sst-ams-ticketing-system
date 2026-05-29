'use client';

import React from 'react';
import Link from 'next/link';
import { Cpu, Terminal, ArrowRight, Shield, Activity, HelpCircle, Layers } from 'lucide-react';
import { BrandedLogo } from '../components/ui/BrandedLogo';
import { BRAND_CONFIG } from '../config/branding';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-950 flex flex-col font-mono selection:bg-zinc-950 selection:text-white">
      {/* Navigation header */}
      <header className="h-16 px-6 md:px-12 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrandedLogo width={24} height={24} />
          <span className="font-bold text-xs tracking-wider uppercase">{BRAND_CONFIG.shortName}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-1.5 border border-zinc-200 hover:border-zinc-950 rounded text-xs font-bold transition uppercase tracking-wider"
          >
            Portal Login
          </Link>
        </div>
      </header>

      {/* Main hero section */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-6 py-20 text-center space-y-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-zinc-100 border border-zinc-200 text-[10px] uppercase tracking-wider font-bold">
          <BrandedLogo width={12} height={12} className="animate-pulse" />
          Enterprise-level Support Hub
        </div>

        {/* Hero Title */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-zinc-950 uppercase leading-none">
            {BRAND_CONFIG.name}
          </h1>
          <p className="text-xs md:text-sm text-zinc-500 max-w-xl mx-auto leading-relaxed">
            High-contrast enterprise SaaS platform for SAP Module SLA Management, Incident Routing, Transport Request audits, and AI-suggested resolutions.
          </p>
        </div>

        {/* CTA Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="px-6 py-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded text-xs font-bold flex items-center gap-2 transition uppercase tracking-wider shadow-sm"
          >
            Enter Service Desk
            <ArrowRight size={14} />
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 border border-zinc-200 hover:border-zinc-950 rounded text-xs font-bold transition uppercase tracking-wider"
          >
            Developer Codebase
          </a>
        </div>

        {/* Grid Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 w-full text-left">
          
          {/* Card 1 */}
          <div className="p-6 border border-zinc-200 rounded-lg hover:border-zinc-950 transition space-y-4">
            <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center text-zinc-950">
              <Layers size={16} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider">Role-Based Workspaces</h3>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Separate workspaces for Super Admins, Managers, Consultants, and Customers. Strict RLS filters enforce that customer tickets remain isolated.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 border border-zinc-200 rounded-lg hover:border-zinc-950 transition space-y-4">
            <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center text-zinc-950">
              <Activity size={16} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider">SLA Guard Engine</h3>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Strict response and resolution timers governed by priority (Critical P1 to Low P4). Dynamic SlaBadges track ticking deadlines in real-time.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 border border-zinc-200 rounded-lg hover:border-zinc-950 transition space-y-4">
            <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center text-zinc-950">
              <Terminal size={16} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider">SAP Transport Auditing</h3>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Log transport requests directly against functional enhancements. Full timeline audits track ticket state transitions from creation to closure.
            </p>
          </div>

        </div>

        {/* Info Banner */}
        <div className="p-8 border border-zinc-200 rounded-lg bg-zinc-55/10 w-full flex flex-col md:flex-row items-center justify-between gap-6 text-left">
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider">Need immediate assistance?</h4>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Sign in as a Customer to chat with our automated AI assistant for resolving MM/SD config issues.
            </p>
          </div>
          <Link
            href="/login"
            className="text-xs font-bold text-zinc-950 hover:underline uppercase tracking-widest flex items-center gap-1 shrink-0"
          >
            Launch Chatbot &rarr;
          </Link>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-[10px] text-zinc-400 border-t border-zinc-200 font-mono mt-auto">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield size={12} className="text-zinc-500" />
          <span>Complies with SAP NetWeaver Enterprise Security Protocols</span>
        </div>
        <span>&copy; {new Date().getFullYear()} {BRAND_CONFIG.name}. All rights reserved.</span>
      </footer>

    </div>
  );
}
