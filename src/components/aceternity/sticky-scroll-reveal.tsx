'use client';

import React, { useRef, useState } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface StickyScrollItem {
  title: string;
  description: string;
  badge: string;
  content: React.ReactNode;
}

// Aceternity Sticky Scroll Reveal — light adaptation: text scrolls on the left,
// a sticky preview panel cross-fades on the right.
export function StickyScroll({ content, className }: { content: StickyScrollItem[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.4', 'end 0.6'] });

  useMotionValueEvent(scrollYProgress, 'change', latest => {
    const breakpoints = content.map((_, i) => i / content.length);
    const closest = breakpoints.reduce(
      (acc, bp, i) => (Math.abs(latest - bp) < Math.abs(latest - breakpoints[acc]) ? i : acc),
      0
    );
    setActiveCard(closest);
  });

  return (
    <div ref={ref} className={cn('relative grid grid-cols-1 gap-10 lg:grid-cols-2', className)}>
      <div>
        {content.map((item, index) => (
          <div key={item.title} className="flex min-h-[260px] flex-col justify-center py-10 lg:min-h-[330px]">
            <motion.span
              animate={{ opacity: activeCard === index ? 1 : 0.35 }}
              className="mb-3 w-fit rounded-full border border-blue-100 bg-blue-50 px-3 py-1 font-mono text-[10px] font-bold tracking-wider text-blue-700 uppercase"
            >
              {item.badge}
            </motion.span>
            <motion.h3
              animate={{ opacity: activeCard === index ? 1 : 0.35 }}
              className="font-sans text-2xl font-bold tracking-tight text-zinc-950"
            >
              {item.title}
            </motion.h3>
            <motion.p
              animate={{ opacity: activeCard === index ? 1 : 0.35 }}
              className="mt-3 max-w-md font-sans text-sm leading-relaxed text-zinc-500"
            >
              {item.description}
            </motion.p>
          </div>
        ))}
      </div>
      <div className="sticky top-28 hidden h-[420px] items-center lg:flex">
        <div className="relative h-full w-full overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white shadow-[0_24px_60px_-24px_rgba(16,24,40,0.18)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCard}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="absolute inset-0 p-6"
            >
              {content[activeCard].content}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
