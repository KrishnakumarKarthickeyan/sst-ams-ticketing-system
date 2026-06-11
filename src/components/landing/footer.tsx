'use client';

import React from 'react';
import Link from 'next/link';
import { BrandedLogo } from '../ui/BrandedLogo';

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Platform',
    links: [
      { label: 'Incident Management', href: '#features' },
      { label: 'Service Requests', href: '#features' },
      { label: 'SLA Engine', href: '#features' },
      { label: 'AI Copilot', href: '#ai' },
      { label: 'Analytics', href: '#analytics' },
    ],
  },
  {
    heading: 'Solutions',
    links: [
      { label: 'SAP AMS Teams', href: '#solutions' },
      { label: 'Managed Services', href: '#solutions' },
      { label: 'Internal IT', href: '#solutions' },
      { label: 'Consulting Firms', href: '#solutions' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Product Tour', href: '#features' },
      { label: 'Customer Stories', href: '#customers' },
      { label: 'ROI Outcomes', href: '#security' },
      { label: 'Workflow Guide', href: '#platform' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Contact Sales', href: '#contact' },
      { label: 'Request Demo', href: '#contact' },
      { label: 'Join Waitlist', href: '#waitlist' },
      { label: 'Sign In', href: '/login' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '#platform' },
      { label: 'Customers', href: '#customers' },
      { label: 'Security', href: '#security' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Data Processing', href: '#' },
      { label: 'Compliance', href: '#security' },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50/70">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-8">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <BrandedLogo width={26} height={26} />
              <span className="font-mono text-sm font-bold tracking-wider text-zinc-950">ASSIST360</span>
            </div>
            <p className="mt-3 max-w-xs font-sans text-xs leading-relaxed text-zinc-500">
              The AI-powered enterprise ITSM platform for incidents, service requests,
              contracts, SLAs and executive analytics.
            </p>
          </div>
          {COLUMNS.map(col => (
            <div key={col.heading}>
              <h4 className="font-mono text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                {col.heading}
              </h4>
              <ul className="mt-3.5 space-y-2.5">
                {col.links.map(link => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link href={link.href} className="font-sans text-xs text-zinc-600 transition-colors hover:text-zinc-950">
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} className="font-sans text-xs text-zinc-600 transition-colors hover:text-zinc-950">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-zinc-200 pt-7 sm:flex-row">
          <p className="font-sans text-xs text-zinc-500">
            Copyright &copy; {new Date().getFullYear()} Support Studio Technologies. All Rights Reserved.
          </p>
          <p className="font-mono text-[10px] tracking-wider text-zinc-400 uppercase">
            Enterprise ITSM · AI Operations · SLA Governance
          </p>
        </div>
      </div>
    </footer>
  );
}
