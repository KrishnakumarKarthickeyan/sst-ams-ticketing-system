'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

// Aceternity Background Gradient — animated conic glow behind a card.
export function BackgroundGradient({
  children,
  className,
  containerClassName,
  animate = true,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
}) {
  const variants = {
    initial: { backgroundPosition: '0 50%' },
    animate: { backgroundPosition: ['0 50%', '100% 50%', '0 50%'] },
  };
  const gradient =
    'bg-[radial-gradient(circle_farthest-side_at_0_100%,#bfdbfe,transparent),radial-gradient(circle_farthest-side_at_100%_0,#c7d2fe,transparent),radial-gradient(circle_farthest-side_at_100%_100%,#a5f3fc,transparent),radial-gradient(circle_farthest-side_at_0_0,#dbeafe,#f4f4f5)]';

  return (
    <div className={cn('group relative p-[3px]', containerClassName)}>
      <motion.div
        variants={animate ? variants : undefined}
        initial="initial"
        animate="animate"
        transition={animate ? { duration: 6, repeat: Infinity, repeatType: 'reverse' } : undefined}
        style={{ backgroundSize: animate ? '400% 400%' : undefined }}
        className={cn(
          'absolute inset-0 z-[1] rounded-2xl opacity-60 blur-xl transition duration-500 group-hover:opacity-90',
          gradient
        )}
      />
      <motion.div
        variants={animate ? variants : undefined}
        initial="initial"
        animate="animate"
        transition={animate ? { duration: 6, repeat: Infinity, repeatType: 'reverse' } : undefined}
        style={{ backgroundSize: animate ? '400% 400%' : undefined }}
        className={cn('absolute inset-0 z-[1] rounded-2xl', gradient)}
      />
      <div className={cn('relative z-10 rounded-2xl', className)}>{children}</div>
    </div>
  );
}
