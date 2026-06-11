'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Tags, Target, Lightbulb, TrendingUp, Siren, ShieldAlert,
  PieChart, Search, Route
} from 'lucide-react';
import { LampContainer } from '../aceternity/lamp';
import { CardSpotlight } from '../aceternity/card-spotlight';

const AI_FEATURES = [
  { icon: Tags, title: 'AI Ticket Classification', text: 'Module, category and request type detected from raw descriptions.' },
  { icon: Target, title: 'AI Priority Prediction', text: 'Business impact scored against history to set the right priority.' },
  { icon: Lightbulb, title: 'AI Resolution Suggestions', text: 'Similar incidents and knowledge surfaced before work begins.' },
  { icon: TrendingUp, title: 'AI Workload Forecasting', text: 'Queue load predicted per module and consultant, 7 days out.' },
  { icon: Siren, title: 'AI Escalation Prediction', text: 'Tickets likely to escalate get flagged while they are still calm.' },
  { icon: ShieldAlert, title: 'AI SLA Breach Detection', text: 'Continuous countdown analysis triggers action before breach.' },
  { icon: PieChart, title: 'AI Executive Insights', text: 'Anomalies and trends narrated for leadership, automatically.' },
  { icon: Search, title: 'AI Knowledge Search', text: 'Semantic search across resolutions, comments and runbooks.' },
  { icon: Route, title: 'AI Smart Routing', text: 'Skills, capacity and history matched to assign the best owner.' },
];

export function AiSection() {
  return (
    <section id="ai" className="bg-white">
      <LampContainer className="pt-10">
        <motion.span
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="font-mono text-[11px] font-bold tracking-widest text-blue-600 uppercase"
        >
          Assist360 Intelligence
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-3 max-w-2xl text-center text-3xl font-bold tracking-tight text-zinc-950 [font-family:var(--font-inter-tight),Inter,sans-serif] sm:text-4xl"
        >
          Meet Your AI Service Operations Copilot
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-4 max-w-xl text-center font-sans text-base text-zinc-500"
        >
          Nine intelligence systems working the queue with your team — classifying, predicting,
          routing and explaining, around the clock.
        </motion.p>
      </LampContainer>

      <div className="mx-auto max-w-6xl px-5 pb-24 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AI_FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.1 }}
            >
              <CardSpotlight className="h-full p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                  <feature.icon size={16} className="text-blue-600" />
                </div>
                <h3 className="mt-3.5 font-sans text-sm font-bold text-zinc-950">{feature.title}</h3>
                <p className="mt-1.5 font-sans text-xs leading-relaxed text-zinc-500">{feature.text}</p>
              </CardSpotlight>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
