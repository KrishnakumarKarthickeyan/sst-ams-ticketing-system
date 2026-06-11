'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

// Aceternity Lamp — light-theme adaptation: instead of the stock dark scene,
// twin conic beams cast a soft enterprise-blue glow onto a white stage.
export function LampContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative z-0 flex w-full flex-col items-center justify-center overflow-hidden rounded-none bg-gradient-to-b from-zinc-50 to-white',
        className
      )}
    >
      <div className="relative isolate z-0 flex w-full flex-1 scale-y-100 items-center justify-center pt-24 pb-10">
        <motion.div
          initial={{ opacity: 0.4, width: '12rem' }}
          whileInView={{ opacity: 0.8, width: '26rem' }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8, ease: 'easeInOut' }}
          style={{ backgroundImage: 'conic-gradient(var(--conic-position), #3B82F6 0deg, transparent 120deg)' }}
          className="absolute inset-auto right-1/2 h-48 w-[26rem] overflow-visible bg-gradient-conic [--conic-position:from_70deg_at_center_top] opacity-30 blur-2xl"
        />
        <motion.div
          initial={{ opacity: 0.4, width: '12rem' }}
          whileInView={{ opacity: 0.8, width: '26rem' }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8, ease: 'easeInOut' }}
          style={{ backgroundImage: 'conic-gradient(var(--conic-position), transparent 240deg, #6366F1 360deg)' }}
          className="absolute inset-auto left-1/2 h-48 w-[26rem] bg-gradient-conic [--conic-position:from_290deg_at_center_top] opacity-30 blur-2xl"
        />
        <motion.div
          initial={{ width: '8rem', opacity: 0.3 }}
          whileInView={{ width: '18rem', opacity: 0.7 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-auto z-30 h-24 -translate-y-[3rem] rounded-full bg-blue-200 blur-3xl"
        />
        <motion.div
          initial={{ width: '10rem', opacity: 0 }}
          whileInView={{ width: '24rem', opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-auto z-50 h-0.5 -translate-y-[5rem] bg-gradient-to-r from-transparent via-blue-500 to-transparent"
        />
      </div>
      <div className="relative z-50 flex w-full -translate-y-16 flex-col items-center px-5">{children}</div>
    </div>
  );
}
