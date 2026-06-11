'use client';

import React, { useEffect } from 'react';
import { motion, stagger, useAnimate } from 'framer-motion';
import { cn } from '../../lib/utils';

// Aceternity Text Generate Effect — words blur/fade in sequentially.
export function TextGenerateEffect({
  words,
  className,
  highlight = [],
  duration = 0.6,
}: {
  words: string;
  className?: string;
  highlight?: string[];
  duration?: number;
}) {
  const [scope, animate] = useAnimate();
  const wordsArray = words.split(' ');

  useEffect(() => {
    animate(
      'span',
      { opacity: 1, filter: 'blur(0px)' },
      { duration, delay: stagger(0.12) }
    );
  }, [animate, duration]);

  return (
    <div ref={scope} className={cn(className)}>
      {wordsArray.map((word, idx) => (
        <motion.span
          key={word + idx}
          className={cn(
            'inline-block opacity-0',
            highlight.includes(word) ? 'text-blue-600' : 'text-zinc-950'
          )}
          style={{ filter: 'blur(8px)' }}
        >
          {word}
          {idx < wordsArray.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </div>
  );
}
