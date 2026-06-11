'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MovingCardItem {
  quote: string;
  name: string;
  title: string;
  company: string;
  initials: string;
  rating: number;
}

// Aceternity Infinite Moving Cards — CSS-marquee testimonial rail.
export function InfiniteMovingCards({
  items,
  direction = 'left',
  speed = 'slow',
  pauseOnHover = true,
  className,
}: {
  items: MovingCardItem[];
  direction?: 'left' | 'right';
  speed?: 'fast' | 'normal' | 'slow';
  pauseOnHover?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);

  const addAnimation = useCallback(() => {
    if (!containerRef.current || !scrollerRef.current) return;
    const scrollerContent = Array.from(scrollerRef.current.children);
    scrollerContent.forEach(item => {
      scrollerRef.current!.appendChild(item.cloneNode(true));
    });
    containerRef.current.style.setProperty('--animation-direction', direction === 'left' ? 'forwards' : 'reverse');
    const durations = { fast: '24s', normal: '45s', slow: '90s' };
    containerRef.current.style.setProperty('--animation-duration', durations[speed]);
    setStart(true);
  }, [direction, speed]);

  useEffect(() => {
    addAnimation();
  }, [addAnimation]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'scroller relative z-10 max-w-full overflow-hidden',
        '[mask-image:linear-gradient(to_right,transparent,white_12%,white_88%,transparent)]',
        className
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          'flex w-max min-w-full shrink-0 flex-nowrap gap-4 py-4',
          start && 'animate-marquee',
          pauseOnHover && 'hover:[animation-play-state:paused]'
        )}
      >
        {items.map(item => (
          <li
            key={item.name}
            className="relative w-[320px] max-w-full shrink-0 rounded-xl border border-zinc-200 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] md:w-[400px]"
          >
            <div className="mb-3 flex items-center gap-0.5">
              {Array.from({ length: item.rating }).map((_, i) => (
                <Star key={i} size={12} className="fill-amber-400 stroke-none" />
              ))}
            </div>
            <blockquote className="font-sans text-[13px] leading-relaxed text-zinc-600">
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 font-mono text-[11px] font-bold text-blue-700">
                {item.initials}
              </div>
              <div>
                <div className="font-sans text-xs font-bold text-zinc-950">{item.name}</div>
                <div className="font-sans text-[11px] text-zinc-500">
                  {item.title} · {item.company}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
