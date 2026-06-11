'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { cn } from '../../lib/utils';

// Aceternity Tracing Beam — scroll-driven gradient line tracing content.
export function TracingBeam({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [svgHeight, setSvgHeight] = useState(0);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useEffect(() => {
    const measure = () => {
      if (contentRef.current) setSvgHeight(contentRef.current.offsetHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const y1 = useSpring(useTransform(scrollYProgress, [0, 0.9], [40, svgHeight]), {
    stiffness: 400,
    damping: 90,
  });
  const y2 = useSpring(useTransform(scrollYProgress, [0, 1], [40, svgHeight - 160]), {
    stiffness: 400,
    damping: 90,
  });

  return (
    <motion.div ref={ref} className={cn('relative mx-auto h-full w-full', className)}>
      <div className="absolute top-3 -left-4 hidden md:-left-16 md:block">
        <motion.div
          transition={{ duration: 0.2, delay: 0.5 }}
          animate={{ boxShadow: scrollYProgress.get() > 0 ? 'none' : 'rgba(37,99,235,0.24) 0px 3px 8px' }}
          className="border-netural-200 ml-[27px] flex h-4 w-4 items-center justify-center rounded-full border shadow-sm"
        >
          <motion.div
            transition={{ duration: 0.2, delay: 0.5 }}
            animate={{
              backgroundColor: scrollYProgress.get() > 0 ? 'white' : '#2563EB',
              borderColor: scrollYProgress.get() > 0 ? 'white' : '#1d4ed8',
            }}
            className="h-2 w-2 rounded-full border border-zinc-300 bg-white"
          />
        </motion.div>
        <svg
          viewBox={`0 0 20 ${svgHeight}`}
          width="20"
          height={svgHeight}
          className="ml-4 block"
          aria-hidden="true"
        >
          <motion.path
            d={`M 1 0 V -36 l 18 24 V ${svgHeight * 0.8} l -18 24 V ${svgHeight}`}
            fill="none"
            stroke="#E4E4E7"
            strokeOpacity="0.9"
            transition={{ duration: 10 }}
          />
          <motion.path
            d={`M 1 0 V -36 l 18 24 V ${svgHeight * 0.8} l -18 24 V ${svgHeight}`}
            fill="none"
            stroke="url(#tracing_gradient)"
            strokeWidth="1.5"
            className="motion-reduce:hidden"
            transition={{ duration: 10 }}
          />
          <defs>
            <motion.linearGradient
              id="tracing_gradient"
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2="0"
              y1={y1}
              y2={y2}
            >
              <stop stopColor="#2563EB" stopOpacity="0" />
              <stop stopColor="#2563EB" />
              <stop offset="0.325" stopColor="#4F46E5" />
              <stop offset="1" stopColor="#06B6D4" stopOpacity="0" />
            </motion.linearGradient>
          </defs>
        </svg>
      </div>
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
}
