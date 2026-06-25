'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, ShieldCheck, Sparkles, Activity, Clock, AlertTriangle,
  Users, TrendingUp, CheckCircle2, BrainCircuit, Gauge
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Spotlight } from '../aceternity/spotlight';
import { TextGenerateEffect } from '../aceternity/text-generate-effect';

const slaTrend = [
  { d: 1, v: 96.8 }, { d: 2, v: 97.4 }, { d: 3, v: 97.1 }, { d: 4, v: 98.2 },
  { d: 5, v: 98.6 }, { d: 6, v: 98.4 }, { d: 7, v: 99.1 },
];
const workload = [
  { d: 'M', v: 34 }, { d: 'T', v: 51 }, { d: 'W', v: 42 }, { d: 'T2', v: 63 },
  { d: 'F', v: 47 }, { d: 'S', v: 22 }, { d: 'S2', v: 18 },
];

const TRUST_BADGES = [
  { icon: Activity, label: '99.98% Uptime' },
  { icon: ShieldCheck, label: 'Enterprise Security' },
  { icon: Sparkles, label: 'AI Powered' },
  { icon: CheckCircle2, label: 'ISO Ready' },
];

function FloatingCard({
  children, className, delay = 0,
}: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
      className={className}
    >
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 5 + delay * 2, repeat: Infinity, ease: 'easeInOut', delay }}
        className="rounded-xl border border-zinc-200 bg-white/90 shadow-[0_16px_48px_-16px_rgba(16,24,40,0.18)] backdrop-blur"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section id="platform" className="relative overflow-hidden bg-white pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f1f3_1px,transparent_1px),linear-gradient(to_bottom,#f1f1f3_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)]" />
      {/* Spotlight */}
      <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" />
      {/* Gradient wash */}
      <motion.div
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-48 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(37,99,235,0.10),rgba(99,102,241,0.06),transparent)] blur-2xl"
      />

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 lg:grid-cols-2 lg:gap-10 lg:px-8">
        {/* ── Left: copy ── */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5"
          >
            <Sparkles size={12} className="text-blue-600" />
            <span className="font-mono text-[10px] font-bold tracking-widest text-blue-700 uppercase">
              AI-Native Service Operations
            </span>
          </motion.div>

          <TextGenerateEffect
            words="Enterprise ITSM Reimagined with AI"
            highlight={['AI']}
            className="max-w-xl text-4xl leading-[1.08] font-bold tracking-tight [font-family:var(--font-inter-tight),Inter,sans-serif] sm:text-5xl lg:text-[3.4rem]"
          />

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-6 max-w-lg font-sans text-base leading-relaxed text-zinc-500 sm:text-lg"
          >
            Manage incidents, service requests, approvals, consultants, contracts, SLA
            commitments, and operational workflows through one intelligent platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.15 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <a
              href="#contact"
              className="group inline-flex items-center gap-2 rounded-full bg-zinc-950 px-6 py-3 font-sans text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] transition-all hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-[0_14px_32px_-10px_rgba(0,0,0,0.45)]"
            >
              Request Demo
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3 font-sans text-sm font-semibold text-zinc-950 transition-all hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50"
            >
              Join Waitlist
            </a>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-zinc-100 pt-6"
          >
            {TRUST_BADGES.map(badge => (
              <div key={badge.label} className="flex items-center gap-1.5 text-zinc-500">
                <badge.icon size={13} className="text-blue-600" />
                <span className="font-mono text-[11px] font-semibold tracking-wide">{badge.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Right: dashboard visualization ── */}
        <div className="relative hidden min-h-[520px] sm:block">
          {/* Main dashboard card */}
          <FloatingCard delay={0.2} className="relative z-10 mx-auto max-w-md lg:ml-auto">
            <div className="p-5">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <span className="font-mono text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                  Service Operations Cockpit
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-600 uppercase">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 py-4">
                {[
                  { label: 'Open', value: '128', icon: Activity, tone: 'text-blue-600' },
                  { label: 'Escalated', value: '6', icon: AlertTriangle, tone: 'text-red-500' },
                  { label: 'Approvals', value: '14', icon: CheckCircle2, tone: 'text-info' },
                ].map(kpi => (
                  <div key={kpi.label} className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-2.5">
                    <kpi.icon size={13} className={kpi.tone} />
                    <div className="mt-1.5 font-mono text-lg font-bold text-zinc-950">{kpi.value}</div>
                    <div className="font-sans text-[10px] font-medium text-zinc-400">{kpi.label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold tracking-wider text-zinc-400 uppercase">SLA Compliance</span>
                  <span className="font-mono text-[11px] font-bold text-emerald-600">99.1%</span>
                </div>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 160 }}>
                    <AreaChart data={slaTrend} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="heroSla" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.16} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke="#2563EB" strokeWidth={2} fill="url(#heroSla)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <span className="font-mono text-[10px] font-bold tracking-wider text-zinc-400 uppercase">Team Workload</span>
                <div className="h-12">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 160 }}>
                    <BarChart data={workload} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <Bar dataKey="v" fill="#A5B4FC" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </FloatingCard>

          {/* Floating KPI: AI insight */}
          <FloatingCard delay={0.55} className="absolute -left-2 top-6 z-20 w-56 lg:left-0">
            <div className="flex items-start gap-2.5 p-3.5">
              <div className="rounded-lg bg-indigo-50 p-2">
                <BrainCircuit size={15} className="text-indigo-600" />
              </div>
              <div>
                <div className="font-sans text-[11px] font-bold text-zinc-950">AI Insight</div>
                <div className="mt-0.5 font-sans text-[10.5px] leading-snug text-zinc-500">
                  Basis queue trending +18% — recommend reassigning 2 consultants.
                </div>
              </div>
            </div>
          </FloatingCard>

          {/* Floating KPI: SLA risk */}
          <FloatingCard delay={0.8} className="absolute bottom-16 -left-4 z-20 w-48 lg:left-2">
            <div className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] font-bold tracking-widest text-zinc-400 uppercase">SLA Risk</span>
                <Gauge size={13} className="text-amber-500" />
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-zinc-950">3 tickets</div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '24%' }}
                  transition={{ duration: 1.2, delay: 1.4 }}
                  className="h-full rounded-full bg-amber-400"
                />
              </div>
              <div className="mt-1 font-sans text-[10px] text-zinc-400">breach window &lt; 4h</div>
            </div>
          </FloatingCard>

          {/* Floating KPI: resolution */}
          <FloatingCard delay={1.05} className="absolute right-0 bottom-2 z-20 w-52 lg:-right-3">
            <div className="flex items-center gap-3 p-3.5">
              <div className="rounded-lg bg-emerald-50 p-2">
                <TrendingUp size={15} className="text-emerald-600" />
              </div>
              <div>
                <div className="font-mono text-lg leading-none font-bold text-zinc-950">-42%</div>
                <div className="mt-1 font-sans text-[10px] text-zinc-500">Resolution time this quarter</div>
              </div>
            </div>
          </FloatingCard>

          {/* Floating KPI: workload */}
          <FloatingCard delay={1.25} className="absolute -top-4 right-2 z-20 w-44 lg:-right-2">
            <div className="flex items-center gap-2.5 p-3">
              <Users size={14} className="text-blue-600" />
              <div>
                <div className="font-mono text-sm leading-none font-bold text-zinc-950">24 consultants</div>
                <div className="mt-0.5 font-sans text-[10px] text-zinc-400">balanced · 81% capacity</div>
              </div>
              <Clock size={12} className="ml-auto text-zinc-300" />
            </div>
          </FloatingCard>
        </div>
      </div>
    </section>
  );
}
