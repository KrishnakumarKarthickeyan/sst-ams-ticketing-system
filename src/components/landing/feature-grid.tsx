'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  BrainCircuit, FileSignature, UserCog, Boxes, BookOpen, Siren, GitBranch,
  FileBarChart, Zap, ScrollText, FolderLock, Building2, KeyRound, Plug,
  Workflow, Search, LayoutDashboard, Timer, FormInput, ShieldCheck,
  Activity, LineChart, CalendarRange, BellRing
} from 'lucide-react';
import { CardSpotlight } from '../aceternity/card-spotlight';

const FEATURES = [
  { icon: BrainCircuit, title: 'AI Copilot', text: 'Classification, routing and suggestions in every queue.' },
  { icon: FileSignature, title: 'Contract Tracking', text: 'Budgets, burn rates and renewals reconciled live.' },
  { icon: UserCog, title: 'Role Management', text: 'SuperAdmin, Manager, Consultant and Customer governance.' },
  { icon: Boxes, title: 'Asset Management', text: 'Systems and landscapes linked to every ticket.' },
  { icon: BookOpen, title: 'Knowledge Base', text: 'Resolutions become searchable institutional memory.' },
  { icon: Siren, title: 'Escalation Engine', text: 'Acknowledgement tracking with executive visibility.' },
  { icon: GitBranch, title: 'Approval Matrix', text: 'Configurable chains for estimates, closures and reopens.' },
  { icon: FileBarChart, title: 'Advanced Reporting', text: 'Operational and executive reports without exports.' },
  { icon: Zap, title: 'Realtime Updates', text: 'Sub-second sync across every connected dashboard.' },
  { icon: ScrollText, title: 'Audit Logs', text: 'Every privileged action recorded immutably.' },
  { icon: FolderLock, title: 'Document Management', text: 'Versioned, permission-scoped attachments.' },
  { icon: Building2, title: 'Multi Tenant', text: 'Row-level isolation between every customer org.' },
  { icon: KeyRound, title: 'SSO Ready', text: 'SAML / OIDC identity federation for the enterprise.' },
  { icon: Plug, title: 'API Integrations', text: 'REST APIs and webhooks for your toolchain.' },
  { icon: Workflow, title: 'Custom Workflows', text: 'Status flows modeled on how your desk works.' },
  { icon: Search, title: 'Advanced Search', text: 'Filters across modules, people, priority and time.' },
  { icon: LayoutDashboard, title: 'Dashboard Builder', text: 'Role-specific cockpits for every persona.' },
  { icon: Timer, title: 'Custom SLA', text: 'Per-organization targets with tiered defaults.' },
  { icon: FormInput, title: 'Custom Forms', text: 'Request types with the fields your business needs.' },
  { icon: ShieldCheck, title: 'User Governance', text: 'Lockouts, password policy and forced rotation.' },
  { icon: Activity, title: 'Operational Insights', text: 'Queue health and aging surfaced continuously.' },
  { icon: LineChart, title: 'Executive Insights', text: 'Trends and anomalies narrated for leadership.' },
  { icon: CalendarRange, title: 'Workload Planning', text: 'Capacity and forecast in one planning view.' },
  { icon: BellRing, title: 'Notification Engine', text: 'Targeted, real-time alerts on every event.' },
];

export function FeatureGrid() {
  return (
    <section className="bg-zinc-50/70 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="font-mono text-[11px] font-bold tracking-widest text-blue-600 uppercase">
            Why Assist360
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 [font-family:var(--font-inter-tight),Inter,sans-serif] sm:text-4xl">
            Everything an enterprise service desk needs
          </h2>
          <p className="mt-4 font-sans text-base text-zinc-500">
            Twenty-four capabilities, one coherent platform — no plugin roulette.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.06 }}
            >
              <CardSpotlight className="group h-full p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors duration-300 group-hover:bg-blue-50 group-hover:text-blue-600">
                    <feature.icon size={15} />
                  </div>
                  <h3 className="font-sans text-[13px] font-bold text-zinc-950">{feature.title}</h3>
                </div>
                <p className="mt-2.5 font-sans text-xs leading-relaxed text-zinc-500">{feature.text}</p>
              </CardSpotlight>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
