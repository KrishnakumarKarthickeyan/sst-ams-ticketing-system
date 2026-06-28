'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Lock, UserCheck, ScrollText, KeyRound, Fingerprint, Globe2,
  BadgeCheck, Landmark
} from 'lucide-react';
import { CardSpotlight } from '../aceternity/card-spotlight';
import { AnimatedCounter } from '../aceternity/animated-counter';

const SECURITY_ITEMS = [
  { icon: Lock, title: 'Encryption', text: 'TLS in transit, AES-256 at rest — keys rotated on schedule.' },
  { icon: UserCheck, title: 'Role-Based Access', text: 'Row-level security isolates every tenant and role.' },
  { icon: ScrollText, title: 'Audit Logging', text: 'Privileged actions recorded with actor, target and time.' },
  { icon: KeyRound, title: 'Account Lockout', text: 'Automatic lockout after repeated failed sign-in attempts.' },
  { icon: Fingerprint, title: 'Credential Rotation', text: 'Enforced first-login and admin-triggered password resets.' },
  { icon: Globe2, title: 'Data Residency', text: 'Regional hosting options for sovereignty requirements.' },
  { icon: BadgeCheck, title: 'Compliance', text: 'ISO-aligned controls and exportable evidence.' },
  { icon: Landmark, title: 'Enterprise Governance', text: 'Password policy, lockouts and forced rotation built in.' },
];

const ROI_ITEMS = [
  { value: 65, suffix: '%', label: 'Less Manual Work' },
  { value: 42, suffix: '%', label: 'Faster Resolution' },
  { value: 30, suffix: '%', label: 'SLA Improvement' },
  { value: 50, suffix: '%', label: 'Operational Efficiency' },
  { value: 75, suffix: '%', label: 'Reduced Escalations' },
];

export function SecurityRoi() {
  return (
    <section id="security" className="bg-zinc-50/70 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        {/* ── Security ── */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="font-mono text-[11px] font-bold tracking-widest text-blue-600 uppercase">
            Security &amp; Trust
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 [font-family:var(--font-inter-tight),Inter,sans-serif] sm:text-4xl">
            Enterprise security, not an afterthought
          </h2>
          <p className="mt-4 font-sans text-base text-zinc-500">
            The controls your security review will ask about — already in place.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECURITY_ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.07 }}
            >
              <CardSpotlight className="h-full p-5" color="rgba(16, 185, 129, 0.07)">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                  <item.icon size={16} className="text-emerald-600" />
                </div>
                <h3 className="mt-3 font-sans text-sm font-bold text-zinc-950">{item.title}</h3>
                <p className="mt-1.5 font-sans text-xs leading-relaxed text-zinc-500">{item.text}</p>
              </CardSpotlight>
            </motion.div>
          ))}
        </div>

        {/* ── ROI ── */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20 overflow-hidden rounded-2xl border border-blue-100 bg-white px-6 py-12 shadow-[0_24px_64px_-32px_rgba(37,99,235,0.25)] sm:px-12"
        >
          <div className="relative">
            <div className="absolute -top-24 left-1/2 h-64 w-[560px] -translate-x-1/2 rounded-full bg-blue-100/70 blur-3xl" />
            <div className="absolute -bottom-32 right-0 h-56 w-[420px] rounded-full bg-info-soft/60 blur-3xl" />
            <div className="relative text-center">
              <span className="font-mono text-[11px] font-bold tracking-widest text-blue-600 uppercase">
                Measured Outcomes
              </span>
              <h3 className="mt-3 text-2xl font-bold tracking-tight text-zinc-950 [font-family:var(--font-inter-tight),Inter,sans-serif] sm:text-3xl">
                The ROI your CFO can audit
              </h3>
            </div>
            <div className="relative mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {ROI_ITEMS.map(item => (
                <div key={item.label} className="text-center">
                  <div className="font-mono text-3xl font-bold text-blue-700 sm:text-4xl">
                    <AnimatedCounter value={item.value} suffix={item.suffix} />
                  </div>
                  <div className="mt-1.5 font-sans text-xs font-medium text-zinc-500">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
