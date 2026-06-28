'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  User, Ticket, UserCheck, Wrench, CheckCircle2, Flag,
  Archive, FileBarChart, LineChart
} from 'lucide-react';
import { TracingBeam } from '../aceternity/tracing-beam';

const WORKFLOW_STEPS = [
  { icon: User, title: 'Customer', text: 'Raises a request from the portal with module, impact and attachments.' },
  { icon: Ticket, title: 'Ticket', text: 'AI classifies, prioritizes and stamps the SLA clock instantly.' },
  { icon: UserCheck, title: 'Assignment', text: 'Smart routing matches skills, capacity and history.' },
  { icon: Wrench, title: 'Consultant', text: 'Estimates hours, logs effort and collaborates in-thread.' },
  { icon: CheckCircle2, title: 'Approval', text: 'Managers approve estimates and closures with one click.' },
  { icon: Flag, title: 'Resolution', text: 'Fix verified with the customer; satisfaction captured.' },
  { icon: Archive, title: 'Closure', text: 'Hours reconcile against the contract automatically.' },
  { icon: FileBarChart, title: 'Reporting', text: 'Every event feeds live operational reports.' },
  { icon: LineChart, title: 'Executive Analytics', text: 'Leadership sees trends, risks and ROI in real time.' },
];

export function WorkflowBeam() {
  return (
    <section className="bg-zinc-50/70 py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="font-mono text-[11px] font-bold tracking-widest text-blue-600 uppercase">
            End-to-End Workflow
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 [font-family:var(--font-inter-tight),Inter,sans-serif] sm:text-4xl">
            From request to boardroom
          </h2>
          <p className="mt-4 font-sans text-base text-zinc-500">
            One continuous, governed flow — no swivel-chair handoffs.
          </p>
        </div>

        <TracingBeam className="px-2">
          <div className="space-y-10 pl-4 md:pl-0">
            {WORKFLOW_STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45 }}
                className="flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,0.5)]">
                  <step.icon size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[10px] font-bold text-zinc-300">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-sans text-base font-bold text-zinc-950">{step.title}</h3>
                  </div>
                  <p className="mt-1 font-sans text-sm leading-relaxed text-zinc-500">{step.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </TracingBeam>
      </div>
    </section>
  );
}
