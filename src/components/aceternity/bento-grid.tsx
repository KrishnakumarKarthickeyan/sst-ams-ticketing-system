'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

// Aceternity Bento Grid, light enterprise adaptation.
export function BentoGrid({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-3', className)}>
      {children}
    </div>
  );
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      className={cn(
        'group/bento row-span-1 flex flex-col justify-between space-y-4 rounded-xl border border-zinc-200 bg-white p-5',
        'shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow duration-300 hover:shadow-[0_16px_40px_-12px_rgba(16,24,40,0.14)]',
        className
      )}
    >
      {header}
      <div className="transition-transform duration-300 group-hover/bento:translate-x-1">
        {icon}
        {title && <div className="mt-2 font-sans text-sm font-bold text-zinc-950">{title}</div>}
        {description && <div className="mt-1 font-sans text-xs leading-relaxed text-zinc-500">{description}</div>}
      </div>
    </motion.div>
  );
}
