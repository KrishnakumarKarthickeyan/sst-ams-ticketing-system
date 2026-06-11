'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { AnimatedCounter } from '../aceternity/animated-counter';
import { CardSpotlight } from '../aceternity/card-spotlight';

/* Each panel renders a distinct dataset — no repeated visuals. */

const ticketTrends = [
  { m: 'Jan', opened: 410, resolved: 388 }, { m: 'Feb', opened: 452, resolved: 441 },
  { m: 'Mar', opened: 489, resolved: 472 }, { m: 'Apr', opened: 530, resolved: 525 },
  { m: 'May', opened: 506, resolved: 512 }, { m: 'Jun', opened: 548, resolved: 551 },
];
const consultantPerf = [
  { name: 'S. Iyer', score: 94 }, { name: 'K. Tan', score: 91 }, { name: 'A. Rao', score: 88 },
  { name: 'M. Cole', score: 86 }, { name: 'J. Park', score: 83 },
];
const csatTrend = [
  { q: 'Q1 24', v: 4.3 }, { q: 'Q2 24', v: 4.4 }, { q: 'Q3 24', v: 4.6 },
  { q: 'Q4 24', v: 4.6 }, { q: 'Q1 25', v: 4.7 }, { q: 'Q2 25', v: 4.8 },
];
const slaByPriority = [
  { p: 'Critical', v: 99.4, fill: '#EF4444' }, { p: 'High', v: 98.7, fill: '#F97316' },
  { p: 'Medium', v: 99.2, fill: '#2563EB' }, { p: 'Low', v: 99.8, fill: '#10B981' },
];
const resolutionTime = [
  { m: 'Jan', h: 21.4 }, { m: 'Feb', h: 19.8 }, { m: 'Mar', h: 17.2 },
  { m: 'Apr', h: 15.6 }, { m: 'May', h: 13.9 }, { m: 'Jun', h: 12.4 },
];
const escalations = [
  { w: 'W1', v: 9 }, { w: 'W2', v: 7 }, { w: 'W3', v: 8 }, { w: 'W4', v: 5 },
  { w: 'W5', v: 4 }, { w: 'W6', v: 3 },
];
const contractUtilization = [
  { c: 'Acme', used: 81, budget: 100 }, { c: 'Northwind', used: 47, budget: 100 },
  { c: 'Globex', used: 92, budget: 100 }, { c: 'Initech', used: 36, budget: 100 },
  { c: 'Umbrella', used: 64, budget: 100 },
];
const workloadForecast = [
  { d: 'Mon', actual: 42, forecast: 44 }, { d: 'Tue', actual: 51, forecast: 49 },
  { d: 'Wed', actual: 47, forecast: 50 }, { d: 'Thu', actual: 58, forecast: 56 },
  { d: 'Fri', actual: 44, forecast: 47 }, { d: 'Sat', actual: 19, forecast: 22 },
  { d: 'Sun', actual: 14, forecast: 16 },
];

const tooltipStyle = {
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',
  borderRadius: 8,
  border: '1px solid #E4E4E7',
  boxShadow: '0 8px 24px -8px rgba(16,24,40,0.16)',
};

function Panel({
  title, subtitle, children, className, delay = 0,
}: { title: string; subtitle: string; children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      <CardSpotlight className="flex h-full flex-col p-5">
        <div className="mb-3">
          <h3 className="font-sans text-sm font-bold text-zinc-950">{title}</h3>
          <p className="font-sans text-[11px] text-zinc-400">{subtitle}</p>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </CardSpotlight>
    </motion.div>
  );
}

export function EnterpriseAnalytics() {
  return (
    <section id="analytics" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="font-mono text-[11px] font-bold tracking-widest text-blue-600 uppercase">
            Enterprise Analytics
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 [font-family:var(--font-inter-tight),Inter,sans-serif] sm:text-4xl">
            Decisions backed by live operational truth
          </h2>
          <p className="mt-4 font-sans text-base text-zinc-500">
            Every chart in the product renders from operational data — these panels mirror the
            executive workspace your leadership will live in.
          </p>
        </div>

        {/* Executive KPI strip */}
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Avg Resolution', value: <AnimatedCounter value={12.4} decimals={1} suffix="h" />, note: '↓ 42% YoY', tone: 'text-emerald-600' },
            { label: 'SLA Compliance', value: <AnimatedCounter value={99.1} decimals={1} suffix="%" />, note: 'rolling 30d', tone: 'text-blue-600' },
            { label: 'Escalation Rate', value: <AnimatedCounter value={2.1} decimals={1} suffix="%" />, note: '↓ 31% QoQ', tone: 'text-emerald-600' },
            { label: 'CSAT', value: <AnimatedCounter value={4.8} decimals={1} suffix=" / 5" />, note: '90-day rolling', tone: 'text-amber-600' },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="rounded-xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50/60 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              <div className="font-mono text-[10px] font-bold tracking-widest text-zinc-400 uppercase">{kpi.label}</div>
              <div className="mt-1.5 font-mono text-2xl font-bold text-zinc-950">{kpi.value}</div>
              <div className={`mt-0.5 font-sans text-[11px] font-semibold ${kpi.tone}`}>{kpi.note}</div>
            </motion.div>
          ))}
        </div>

        {/* Bento chart grid */}
        <div className="grid auto-rows-[230px] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Panel title="Ticket Trends" subtitle="Opened vs resolved · 6 months" className="md:col-span-2">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 160 }}>
              <AreaChart data={ticketTrends} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="gOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="opened" stroke="#2563EB" strokeWidth={2} fill="url(#gOpened)" />
                <Area type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={2} fill="url(#gResolved)" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="SLA by Priority" subtitle="Compliance per tier" delay={0.05}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 160 }}>
              <RadialBarChart data={slaByPriority} innerRadius="32%" outerRadius="100%" startAngle={90} endAngle={-270}>
                <RadialBar dataKey="v" background={{ fill: '#F4F4F5' }} cornerRadius={6} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, _n, e) => [`${v}%`, (e?.payload as { p?: string })?.p ?? '']}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Consultant Performance" subtitle="Composite score · top 5" delay={0.1}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 160 }}>
              <BarChart data={consultantPerf} layout="vertical" margin={{ top: 0, right: 8, left: -12, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#71717A' }} width={56} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {consultantPerf.map((entry, i) => (
                    <Cell key={entry.name} fill={['#2563EB', '#4F46E5', '#0D9488', '#0284C7', '#64748B'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Resolution Time" subtitle="Mean hours to resolve" delay={0.05}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 160 }}>
              <LineChart data={resolutionTime} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="h" stroke="#D97706" strokeWidth={2.5} dot={{ r: 3, fill: '#D97706' }} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Customer Satisfaction" subtitle="CSAT trajectory · 6 quarters" delay={0.1}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 160 }}>
              <AreaChart data={csatTrend} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCsat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E11D48" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#E11D48" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="q" tick={{ fontSize: 9, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <YAxis domain={[4, 5]} tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="v" stroke="#E11D48" strokeWidth={2} fill="url(#gCsat)" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Escalation Trends" subtitle="Weekly escalations · declining" delay={0.15}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 160 }}>
              <BarChart data={escalations} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
                <XAxis dataKey="w" tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                  {escalations.map((entry, i) => (
                    <Cell key={entry.w} fill={i < 3 ? '#F87171' : '#FCA5A5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Contract Utilization" subtitle="Hours consumed vs budget" className="md:col-span-2" delay={0.1}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 160 }}>
              <BarChart data={contractUtilization} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                <XAxis dataKey="c" tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="used" radius={[4, 4, 0, 0]}>
                  {contractUtilization.map(entry => (
                    <Cell key={entry.c} fill={entry.used > 85 ? '#EF4444' : entry.used > 70 ? '#F59E0B' : '#10B981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Workload Forecasting" subtitle="Actual vs AI forecast" className="md:col-span-2" delay={0.15}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 160 }}>
              <LineChart data={workloadForecast} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="forecast" stroke="#A5B4FC" strokeWidth={2} strokeDasharray="6 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      </div>
    </section>
  );
}
