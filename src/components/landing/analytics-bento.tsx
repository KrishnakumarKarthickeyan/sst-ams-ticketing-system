'use client';

import React from 'react';
import { Ticket, Gauge, Timer, Workflow, Heart, Globe2 } from 'lucide-react';
import { BentoGrid, BentoGridItem } from '../aceternity/bento-grid';
import { AnimatedCounter } from '../aceternity/animated-counter';

const METRICS = [
  {
    icon: Ticket, tone: 'bg-blue-50 text-blue-600',
    value: <AnimatedCounter value={250} suffix="K+" />, label: 'Tickets Managed',
    description: 'Incidents, requests and changes orchestrated across global support desks.',
    span: 'md:col-span-2',
  },
  {
    icon: Gauge, tone: 'bg-emerald-50 text-emerald-600',
    value: <AnimatedCounter value={99.98} decimals={2} suffix="%" />, label: 'SLA Compliance',
    description: 'Continuous breach prediction keeps commitments green.',
    span: '',
  },
  {
    icon: Timer, tone: 'bg-amber-50 text-amber-600',
    value: <AnimatedCounter value={42} suffix="%" />, label: 'Resolution Time Reduction',
    description: 'AI routing and suggestions compress mean time to resolve.',
    span: '',
  },
  {
    icon: Workflow, tone: 'bg-info-soft text-info',
    value: <AnimatedCounter value={87} suffix="%" />, label: 'Automation Rate',
    description: 'Classification, routing and escalations handled without manual touch.',
    span: '',
  },
  {
    icon: Heart, tone: 'bg-rose-50 text-rose-600',
    value: <AnimatedCounter value={95} suffix="%" />, label: 'Customer Satisfaction',
    description: 'CSAT measured continuously at ticket closure.',
    span: '',
  },
  {
    icon: Globe2, tone: 'bg-sky-50 text-sky-600',
    value: <AnimatedCounter value={50} suffix="+" />, label: 'Countries',
    description: 'Follow-the-sun operations on a single tenant-isolated platform.',
    span: 'md:col-span-2',
  },
];

export function AnalyticsBento() {
  return (
    <section id="solutions" className="bg-zinc-50/70 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="font-mono text-[11px] font-bold tracking-widest text-blue-600 uppercase">
            Live Platform Analytics
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 [font-family:var(--font-inter-tight),Inter,sans-serif] sm:text-4xl">
            Operations at enterprise scale
          </h2>
          <p className="mt-4 font-sans text-base text-zinc-500">
            The numbers behind organizations that run their entire service delivery on Assist360.
          </p>
        </div>

        <BentoGrid className="mx-auto max-w-5xl auto-rows-[200px]">
          {METRICS.map(m => (
            <BentoGridItem
              key={m.label}
              className={m.span}
              header={
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${m.tone}`}>
                  <m.icon size={18} />
                </div>
              }
              title={
                <span>
                  <span className="block font-mono text-3xl font-bold tracking-tight text-zinc-950">{m.value}</span>
                  <span className="mt-1 block text-sm font-bold text-zinc-800">{m.label}</span>
                </span>
              }
              description={m.description}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
