'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import { BrandedLogo } from '../ui/BrandedLogo';
import { HoverBorderGradient } from '../aceternity/hover-border-gradient';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { label: 'Platform', href: '#platform' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Features', href: '#features' },
  { label: 'AI', href: '#ai' },
  { label: 'Security', href: '#security' },
  { label: 'Customers', href: '#customers' },
  { label: 'Resources', href: '#analytics' },
  { label: 'Contact', href: '#contact' },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl' : 'bg-transparent'
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        {/* Logo left */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <BrandedLogo width={26} height={26} />
          <span className="font-mono text-sm font-bold tracking-wider text-zinc-950">ASSIST360</span>
        </Link>

        {/* Menu center */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map(item => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-full px-3.5 py-2 font-sans text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Buttons right */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="font-sans text-[13px] font-semibold text-zinc-700 transition-colors hover:text-zinc-950"
          >
            Sign In
          </Link>
          <HoverBorderGradient
            as="a"
            // @ts-expect-error anchor props pass through the polymorphic Tag
            href="#contact"
            containerClassName="rounded-full"
            className="flex items-center gap-1.5 bg-zinc-950 px-4 py-2 font-sans text-[13px] font-semibold text-white"
          >
            Request Demo
            <ArrowRight size={13} />
          </HoverBorderGradient>
        </div>

        {/* Mobile toggle */}
        <button
          aria-label="Toggle navigation menu"
          onClick={() => setMobileOpen(v => !v)}
          className="rounded-md p-2 text-zinc-700 hover:bg-zinc-100 lg:hidden"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-zinc-200 bg-white lg:hidden"
          >
            <div className="space-y-1 px-5 py-4">
              {NAV_ITEMS.map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-3 py-2.5 font-sans text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  {item.label}
                </a>
              ))}
              <div className="flex items-center gap-3 pt-3">
                <Link
                  href="/login"
                  className="flex-1 rounded-full border border-zinc-200 px-4 py-2.5 text-center font-sans text-sm font-semibold text-zinc-950"
                >
                  Sign In
                </Link>
                <a
                  href="#contact"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-full bg-zinc-950 px-4 py-2.5 text-center font-sans text-sm font-semibold text-white"
                >
                  Request Demo
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
