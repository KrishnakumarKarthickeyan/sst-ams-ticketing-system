'use client';

import React from 'react';
import {
  Flame, Inbox, Boxes, BookOpen, FileSignature, CheckCheck,
  Timer, BrainCircuit, BarChart3, Siren
} from 'lucide-react';
import { StickyScroll, StickyScrollItem } from '../aceternity/sticky-scroll-reveal';

function PreviewPanel({
  icon: Icon, title, rows, accent,
}: {
  icon: React.ElementType; title: string; accent: string;
  rows: { left: string; right: string; tone?: string }[];
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-zinc-200 pb-4">
        <div className={`rounded-lg p-2.5 ${accent}`}>
          <Icon size={18} />
        </div>
        <span className="font-mono text-xs font-bold tracking-widest text-zinc-500 uppercase">{title}</span>
        <span className="ml-auto flex gap-1">
          <span className="h-2 w-2 rounded-full bg-zinc-200" />
          <span className="h-2 w-2 rounded-full bg-zinc-200" />
          <span className="h-2 w-2 rounded-full bg-zinc-300" />
        </span>
      </div>
      <div className="flex-1 space-y-2.5 pt-4">
        {rows.map(row => (
          <div
            key={row.left}
            className="flex items-center justify-between rounded-lg border border-zinc-100 bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]"
          >
            <span className="font-sans text-xs font-medium text-zinc-700">{row.left}</span>
            <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${row.tone || 'bg-zinc-100 text-zinc-600'}`}>
              {row.right}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SHOWCASE: StickyScrollItem[] = [
  {
    badge: 'Incident Management',
    title: 'Every incident, triaged in seconds',
    description:
      'AI classifies severity, predicts priority and routes to the right consultant the moment a ticket lands — with full SLA telemetry attached from minute one.',
    content: (
      <PreviewPanel icon={Flame} accent="bg-red-50 text-red-600" title="Incident Queue"
        rows={[
          { left: 'PROD outage — payment gateway', right: 'CRITICAL · 8h SLA', tone: 'bg-red-50 text-red-600' },
          { left: 'MM pricing condition mismatch', right: 'HIGH · 16h SLA', tone: 'bg-orange-50 text-orange-600' },
          { left: 'FI posting period locked', right: 'MEDIUM · 32h SLA', tone: 'bg-blue-50 text-blue-600' },
          { left: 'Report layout request', right: 'LOW · 64h SLA', tone: 'bg-zinc-100 text-zinc-600' },
        ]} />
    ),
  },
  {
    badge: 'Service Requests',
    title: 'Service catalog with built-in governance',
    description:
      'Standardized request types, approval matrices and fulfillment workflows — so routine work flows without email chains or shadow queues.',
    content: (
      <PreviewPanel icon={Inbox} accent="bg-blue-50 text-blue-600" title="Request Pipeline"
        rows={[
          { left: 'New user provisioning — FI/CO', right: 'APPROVED', tone: 'bg-emerald-50 text-emerald-600' },
          { left: 'Authorization role extension', right: 'IN REVIEW', tone: 'bg-amber-50 text-amber-600' },
          { left: 'Transport to QA', right: 'QUEUED', tone: 'bg-zinc-100 text-zinc-600' },
          { left: 'Interface certificate renewal', right: 'FULFILLED', tone: 'bg-emerald-50 text-emerald-600' },
        ]} />
    ),
  },
  {
    badge: 'Contract Governance',
    title: 'Contracts and hours, reconciled live',
    description:
      'Monthly budgets, annual allocations and consumed effort reconcile in real time across every customer contract — no spreadsheet drift, no billing surprises.',
    content: (
      <PreviewPanel icon={FileSignature} accent="bg-info-soft text-info" title="Contract Utilization"
        rows={[
          { left: 'Acme Industries — AMS Gold', right: '81% consumed', tone: 'bg-amber-50 text-amber-600' },
          { left: 'Northwind GmbH — AMS Silver', right: '47% consumed', tone: 'bg-emerald-50 text-emerald-600' },
          { left: 'Globex — Project Pool', right: '92% consumed', tone: 'bg-red-50 text-red-600' },
          { left: 'Initech — Managed Basis', right: '36% consumed', tone: 'bg-emerald-50 text-emerald-600' },
        ]} />
    ),
  },
  {
    badge: 'Approval Workflow',
    title: 'Approvals that never stall',
    description:
      'Hour estimates, closures, reopens and escalations move through configurable approval chains with full audit trails and instant notifications.',
    content: (
      <PreviewPanel icon={CheckCheck} accent="bg-info-soft text-info" title="Approval Center"
        rows={[
          { left: 'Closure — TKT-2218 (S/4 migration)', right: 'AWAITING MGR', tone: 'bg-info-soft text-info' },
          { left: 'Estimate 24h — TKT-2204', right: 'APPROVED', tone: 'bg-emerald-50 text-emerald-600' },
          { left: 'Reopen request — TKT-2151', right: 'ESCALATED', tone: 'bg-red-50 text-red-600' },
          { left: 'Effort log 6.5h — TKT-2233', right: 'APPROVED', tone: 'bg-emerald-50 text-emerald-600' },
        ]} />
    ),
  },
  {
    badge: 'SLA Management',
    title: 'SLA telemetry on every ticket',
    description:
      'Breach prediction, escalation triggers and priority-tiered targets (8h / 16h / 32h / 64h) — enforced consistently across dashboards, reports and notifications.',
    content: (
      <PreviewPanel icon={Timer} accent="bg-amber-50 text-amber-600" title="SLA Monitor"
        rows={[
          { left: 'Critical breach window', right: '0 tickets', tone: 'bg-emerald-50 text-emerald-600' },
          { left: 'At risk — next 4 hours', right: '3 tickets', tone: 'bg-amber-50 text-amber-600' },
          { left: 'Escalation triggers armed', right: '12 active', tone: 'bg-blue-50 text-blue-600' },
          { left: 'Compliance this month', right: '99.1%', tone: 'bg-emerald-50 text-emerald-600' },
        ]} />
    ),
  },
  {
    badge: 'AI Operations',
    title: 'An AI copilot across the whole desk',
    description:
      'Classification, routing, workload forecasting and resolution suggestions are woven into every workflow — not bolted on as a chatbot.',
    content: (
      <PreviewPanel icon={BrainCircuit} accent="bg-sky-50 text-sky-600" title="AI Recommendations"
        rows={[
          { left: 'Route TKT-2241 → S. Iyer (Basis)', right: '96% confidence', tone: 'bg-sky-50 text-sky-600' },
          { left: 'Similar incident: KB-0871', right: 'SUGGESTED', tone: 'bg-info-soft text-info' },
          { left: 'Forecast: +18% MM queue load', right: 'NEXT 7 DAYS', tone: 'bg-amber-50 text-amber-600' },
          { left: 'Breach risk — TKT-2207', right: 'AUTO-ESCALATED', tone: 'bg-red-50 text-red-600' },
        ]} />
    ),
  },
  {
    badge: 'Executive Reporting',
    title: 'Board-ready analytics, zero exports',
    description:
      'Executive scorecards, consultant performance, satisfaction trends and escalation analytics — rendered live from operational data.',
    content: (
      <PreviewPanel icon={BarChart3} accent="bg-emerald-50 text-emerald-600" title="Executive Scorecard"
        rows={[
          { left: 'Resolution time vs target', right: '-42%', tone: 'bg-emerald-50 text-emerald-600' },
          { left: 'CSAT (rolling 90d)', right: '4.8 / 5', tone: 'bg-emerald-50 text-emerald-600' },
          { left: 'Escalation rate', right: '2.1%', tone: 'bg-blue-50 text-blue-600' },
          { left: 'Contract margin health', right: 'ON PLAN', tone: 'bg-emerald-50 text-emerald-600' },
        ]} />
    ),
  },
  {
    badge: 'Escalation Engine',
    title: 'Escalations with teeth',
    description:
      'Acknowledgement tracking, reason codes and executive visibility ensure escalations get owned — not just forwarded.',
    content: (
      <PreviewPanel icon={Siren} accent="bg-rose-50 text-rose-600" title="Escalation Board"
        rows={[
          { left: 'TKT-2207 — gateway latency', right: 'ACK · 12m', tone: 'bg-emerald-50 text-emerald-600' },
          { left: 'TKT-2189 — payroll variance', right: 'UNACK · 38m', tone: 'bg-red-50 text-red-600' },
          { left: 'TKT-2168 — IDoc failures', right: 'RESOLVING', tone: 'bg-amber-50 text-amber-600' },
          { left: 'Weekly escalation trend', right: '-31%', tone: 'bg-emerald-50 text-emerald-600' },
        ]} />
    ),
  },
  {
    badge: 'Knowledge Management',
    title: 'Institutional knowledge, retained',
    description:
      'Resolution histories and asset context become searchable knowledge that compounds — onboarding new consultants in days, not quarters.',
    content: (
      <PreviewPanel icon={BookOpen} accent="bg-info-soft text-info" title="Knowledge & Assets"
        rows={[
          { left: 'KB-0871 — IDoc reprocessing guide', right: '214 uses', tone: 'bg-info-soft text-info' },
          { left: 'KB-0640 — Period-end close runbook', right: '178 uses', tone: 'bg-info-soft text-info' },
          { left: 'Asset map — PRD landscape', right: 'SYNCED', tone: 'bg-emerald-50 text-emerald-600' },
          { left: 'Auto-suggested on similar tickets', right: 'ENABLED', tone: 'bg-blue-50 text-blue-600' },
        ]} />
    ),
  },
  {
    badge: 'Asset Tracking',
    title: 'Service context for every system',
    description:
      'Tickets link to systems, modules and landscapes — so impact analysis and root-cause work start with context instead of archaeology.',
    content: (
      <PreviewPanel icon={Boxes} accent="bg-cyan-50 text-cyan-600" title="Landscape Registry"
        rows={[
          { left: 'PRD — S/4HANA 2023 FPS2', right: 'HEALTHY', tone: 'bg-emerald-50 text-emerald-600' },
          { left: 'QAS — refresh scheduled', right: 'MAINTENANCE', tone: 'bg-amber-50 text-amber-600' },
          { left: 'PI/PO — interface cluster', right: '2 OPEN TKTS', tone: 'bg-blue-50 text-blue-600' },
          { left: 'BW — nightly load chain', right: 'MONITORED', tone: 'bg-zinc-100 text-zinc-600' },
        ]} />
    ),
  },
];

export function ProductShowcase() {
  return (
    <section id="features" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="font-mono text-[11px] font-bold tracking-widest text-blue-600 uppercase">
            Product Showcase
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 [font-family:var(--font-inter-tight),Inter,sans-serif] sm:text-4xl">
            One platform. Every service workflow.
          </h2>
          <p className="mt-4 font-sans text-base text-zinc-500">
            Scroll through the modules that replace your patchwork of trackers, sheets and inboxes.
          </p>
        </div>
        <StickyScroll content={SHOWCASE} />
      </div>
    </section>
  );
}
