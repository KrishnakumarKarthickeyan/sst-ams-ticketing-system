'use client';

import React, { useRef, useState } from 'react';
import { cn } from '../../lib/utils';

// Aceternity Card Spotlight — mouse-tracked radial highlight, light palette.
export function CardSpotlight({
  children,
  className,
  color = 'rgba(37, 99, 235, 0.08)',
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        'relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow duration-300 hover:shadow-[0_16px_40px_-12px_rgba(16,24,40,0.12)]',
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(380px circle at ${position.x}px ${position.y}px, ${color}, transparent 60%)`,
        }}
      />
      {children}
    </div>
  );
}
