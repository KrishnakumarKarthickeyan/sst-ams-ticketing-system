'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

type Direction = 'TOP' | 'LEFT' | 'BOTTOM' | 'RIGHT';

// Aceternity Hover Border Gradient — a rotating gradient ring that locks to a
// full highlight on hover. Light-theme palette.
export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = 'button',
  duration = 1,
  clockwise = true,
  ...props
}: React.PropsWithChildren<
  {
    as?: React.ElementType;
    containerClassName?: string;
    className?: string;
    duration?: number;
    clockwise?: boolean;
  } & React.HTMLAttributes<HTMLElement>
>) {
  const [hovered, setHovered] = useState(false);
  const [direction, setDirection] = useState<Direction>('TOP');

  const rotateDirection = (current: Direction): Direction => {
    const dirs: Direction[] = ['TOP', 'LEFT', 'BOTTOM', 'RIGHT'];
    const idx = dirs.indexOf(current);
    return clockwise ? dirs[(idx - 1 + dirs.length) % dirs.length] : dirs[(idx + 1) % dirs.length];
  };

  const movingMap: Record<Direction, string> = {
    TOP: 'radial-gradient(20.7% 50% at 50% 0%, #2563EB 0%, rgba(37,99,235,0) 100%)',
    LEFT: 'radial-gradient(16.6% 43.1% at 0% 50%, #2563EB 0%, rgba(37,99,235,0) 100%)',
    BOTTOM: 'radial-gradient(20.7% 50% at 50% 100%, #2563EB 0%, rgba(37,99,235,0) 100%)',
    RIGHT: 'radial-gradient(16.2% 41.2% at 100% 50%, #2563EB 0%, rgba(37,99,235,0) 100%)',
  };

  const highlight = 'radial-gradient(75% 181% at 50% 50%, #2563EB 0%, rgba(37,99,235,0) 100%)';

  useEffect(() => {
    if (hovered) return;
    const interval = setInterval(() => setDirection(prev => rotateDirection(prev)), duration * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered]);

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative flex h-min w-fit items-center justify-center overflow-visible rounded-full border border-zinc-200 bg-white/40 p-px transition duration-500',
        containerClassName
      )}
      {...props}
    >
      <div className={cn('z-10 rounded-[inherit] bg-white px-5 py-2.5 text-zinc-950', className)}>
        {children}
      </div>
      <motion.div
        className="absolute inset-0 z-0 flex-none overflow-hidden rounded-[inherit]"
        style={{ filter: 'blur(2px)', width: '100%', height: '100%' }}
        initial={{ background: movingMap[direction] }}
        animate={{ background: hovered ? [movingMap[direction], highlight] : movingMap[direction] }}
        transition={{ ease: 'linear', duration }}
      />
      <div className="z-1 absolute inset-[2px] flex-none rounded-[inherit] bg-white" />
    </Tag>
  );
}
