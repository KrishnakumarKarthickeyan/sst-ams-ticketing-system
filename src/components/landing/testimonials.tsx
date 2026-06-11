'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { InfiniteMovingCards, MovingCardItem } from '../aceternity/infinite-moving-cards';
import { AnimatedCounter } from '../aceternity/animated-counter';

const TESTIMONIALS: MovingCardItem[] = [
  {
    quote: 'Assist360 replaced three trackers and a wall of spreadsheets. SLA compliance went from a monthly argument to a live number nobody disputes.',
    name: 'Priya Raghavan', title: 'VP, IT Operations', company: 'Meridian Manufacturing', initials: 'PR', rating: 5,
  },
  {
    quote: 'The AI routing is uncanny. Tickets land with the right consultant before our leads even open the queue — first-touch resolution is up 38%.',
    name: 'Daniel Okafor', title: 'Head of SAP Services', company: 'Crestline Group', initials: 'DO', rating: 5,
  },
  {
    quote: 'Contract utilization used to take finance a week to reconcile each quarter. Now it is a dashboard my CFO checks over coffee.',
    name: 'Hannah Weiss', title: 'Director, Shared Services', company: 'Alpenstein AG', initials: 'HW', rating: 5,
  },
  {
    quote: 'We run follow-the-sun support across three regions on Assist360. The escalation engine alone paid for the platform.',
    name: 'Marcus Lindqvist', title: 'CIO', company: 'Polaris Logistics', initials: 'ML', rating: 5,
  },
  {
    quote: 'Onboarding a new consultant used to take a quarter. With the knowledge surface and ticket history, they are productive in their first week.',
    name: 'Aisha Demir', title: 'Delivery Director', company: 'Bosphorus Tech', initials: 'AD', rating: 5,
  },
  {
    quote: 'Our customers see their own portal, their own SLAs, their own data — and nothing else. Multi-tenant isolation was the deciding factor.',
    name: 'Tomás Herrera', title: 'Managing Partner', company: 'Andes Consulting', initials: 'TH', rating: 5,
  },
  {
    quote: 'Executive reporting that used to be a 40-slide deck is now a link. Board meetings start from the same live numbers we operate on.',
    name: 'Grace Mwangi', title: 'COO', company: 'Savanna Digital', initials: 'GM', rating: 5,
  },
  {
    quote: 'The approval matrix mapped our delegation-of-authority policy exactly. Audit walked through the logs and signed off in a day.',
    name: 'Jonathan Brooks', title: 'Head of Internal Audit', company: 'Halcyon Energy', initials: 'JB', rating: 5,
  },
];

const REVIEW_STATS = [
  { value: <AnimatedCounter value={4.9} decimals={1} suffix="/5" />, label: 'Average Rating', sub: 'across enterprise reviews' },
  { value: <AnimatedCounter value={98} suffix="%" />, label: 'Retention', sub: 'customers renewing annually' },
  { value: <AnimatedCounter value={96} suffix="%" />, label: 'Satisfaction', sub: 'support experience score' },
  { value: <AnimatedCounter value={95} suffix="%" />, label: 'Recommendation', sub: 'would recommend Assist360' },
];

export function Testimonials() {
  return (
    <section id="customers" className="overflow-hidden bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="font-mono text-[11px] font-bold tracking-widest text-blue-600 uppercase">
            Customer Stories
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 [font-family:var(--font-inter-tight),Inter,sans-serif] sm:text-4xl">
            Trusted by operations leaders
          </h2>
        </div>
      </div>

      <InfiniteMovingCards items={TESTIMONIALS.slice(0, 4)} direction="left" speed="slow" />
      <InfiniteMovingCards items={TESTIMONIALS.slice(4)} direction="right" speed="slow" />

      {/* G2-style review stats */}
      <div className="mx-auto mt-14 max-w-5xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50/80 to-white p-8 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
        >
          <div className="mb-7 flex items-center justify-center gap-2">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} className="fill-amber-400 stroke-none" />
              ))}
            </div>
            <span className="font-sans text-sm font-semibold text-zinc-700">
              Rated by enterprise service teams
            </span>
          </div>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {REVIEW_STATS.map(stat => (
              <div key={stat.label} className="text-center">
                <div className="font-mono text-3xl font-bold text-zinc-950">{stat.value}</div>
                <div className="mt-1 font-sans text-sm font-bold text-zinc-800">{stat.label}</div>
                <div className="font-sans text-[11px] text-zinc-400">{stat.sub}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
