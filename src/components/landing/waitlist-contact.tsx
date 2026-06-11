'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Loader2, Mail, Phone as PhoneIcon } from 'lucide-react';
import { BackgroundGradient } from '../aceternity/background-gradient';
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client';

type SubmitState = 'idle' | 'submitting' | 'done' | 'error';

async function submitLead(payload: {
  lead_type: 'waitlist' | 'demo' | 'contact';
  name: string;
  company?: string;
  email: string;
  phone?: string;
  team_size?: string;
  message?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Lead capture is temporarily unavailable. Please email us directly.' };
  }
  const { error } = await supabase.from('landing_leads').insert(payload);
  if (error) return { ok: false, error: 'Something went wrong — please try again.' };
  return { ok: true };
}

const inputClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 font-sans text-sm text-zinc-950 placeholder:text-zinc-400 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none';

function SuccessNote({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex h-full min-h-[260px] flex-col items-center justify-center text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2 size={22} className="text-emerald-600" />
      </div>
      <p className="mt-4 max-w-xs font-sans text-sm font-semibold text-zinc-950">{text}</p>
      <p className="mt-1 font-sans text-xs text-zinc-500">Our team will reach out shortly.</p>
    </motion.div>
  );
}

export function WaitlistContact() {
  /* ── Waitlist form state ── */
  const [wl, setWl] = useState({ name: '', company: '', email: '', team_size: '' });
  const [wlState, setWlState] = useState<SubmitState>('idle');
  const [wlError, setWlError] = useState('');

  /* ── Contact form state ── */
  const [ct, setCt] = useState({ name: '', company: '', email: '', phone: '', message: '' });
  const [ctState, setCtState] = useState<SubmitState>('idle');
  const [ctError, setCtError] = useState('');
  const [ctIntent, setCtIntent] = useState<'demo' | 'contact'>('demo');

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWlState('submitting');
    setWlError('');
    const res = await submitLead({ lead_type: 'waitlist', ...wl });
    if (res.ok) setWlState('done');
    else {
      setWlState('error');
      setWlError(res.error || 'Submission failed.');
    }
  };

  const handleContact = async (intent: 'demo' | 'contact') => {
    setCtIntent(intent);
    if (!ct.name || !ct.email) {
      setCtState('error');
      setCtError('Name and business email are required.');
      return;
    }
    setCtState('submitting');
    setCtError('');
    const res = await submitLead({ lead_type: intent, ...ct });
    if (res.ok) setCtState('done');
    else {
      setCtState('error');
      setCtError(res.error || 'Submission failed.');
    }
  };

  return (
    <section id="contact" className="bg-white py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 lg:grid-cols-2 lg:gap-14 lg:px-8">
        {/* ── Waitlist: premium glassmorphism card ── */}
        <div id="waitlist">
          <BackgroundGradient containerClassName="h-full" className="h-full bg-white/70 p-7 backdrop-blur-xl sm:p-8">
            <span className="font-mono text-[11px] font-bold tracking-widest text-blue-600 uppercase">
              Early Access
            </span>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 [font-family:var(--font-inter-tight),Inter,sans-serif]">
              Join the waitlist
            </h3>
            <p className="mt-2 font-sans text-sm text-zinc-500">
              Be first in line as we onboard new enterprise tenants each month.
            </p>

            {wlState === 'done' ? (
              <SuccessNote text="You're on the list." />
            ) : (
              <form onSubmit={handleWaitlist} className="mt-6 space-y-3.5">
                <input required placeholder="Full name" value={wl.name}
                  onChange={e => setWl({ ...wl, name: e.target.value })} className={inputClass} />
                <input placeholder="Company" value={wl.company}
                  onChange={e => setWl({ ...wl, company: e.target.value })} className={inputClass} />
                <input required type="email" placeholder="Business email" value={wl.email}
                  onChange={e => setWl({ ...wl, email: e.target.value })} className={inputClass} />
                <select
                  value={wl.team_size}
                  onChange={e => setWl({ ...wl, team_size: e.target.value })}
                  className={`${inputClass} ${wl.team_size ? 'text-zinc-950' : 'text-zinc-400'}`}
                >
                  <option value="">Team size</option>
                  <option value="1-10">1–10</option>
                  <option value="11-50">11–50</option>
                  <option value="51-200">51–200</option>
                  <option value="200+">200+</option>
                </select>
                {wlError && <p className="font-sans text-xs font-medium text-red-600">{wlError}</p>}
                <button
                  type="submit"
                  disabled={wlState === 'submitting'}
                  className="group flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-sans text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.6)] transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {wlState === 'submitting' ? <Loader2 size={15} className="animate-spin" /> : null}
                  Join Waitlist
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </form>
            )}
          </BackgroundGradient>
        </div>

        {/* ── Contact / demo form ── */}
        <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-8">
          <span className="font-mono text-[11px] font-bold tracking-widest text-blue-600 uppercase">
            Talk to Us
          </span>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 [font-family:var(--font-inter-tight),Inter,sans-serif]">
            See Assist360 on your data
          </h3>
          <p className="mt-2 font-sans text-sm text-zinc-500">
            A 30-minute walkthrough with a solutions architect — your workflows, your SLAs.
          </p>

          {ctState === 'done' ? (
            <SuccessNote
              text={ctIntent === 'demo' ? 'Demo request received.' : 'Message sent to our sales team.'}
            />
          ) : (
            <div className="mt-6 flex flex-1 flex-col space-y-3.5">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <input required placeholder="Full name" value={ct.name}
                  onChange={e => setCt({ ...ct, name: e.target.value })} className={inputClass} />
                <input placeholder="Company" value={ct.company}
                  onChange={e => setCt({ ...ct, company: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="relative">
                  <Mail size={13} className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400" />
                  <input required type="email" placeholder="Business email" value={ct.email}
                    onChange={e => setCt({ ...ct, email: e.target.value })} className={`${inputClass} pl-8`} />
                </div>
                <div className="relative">
                  <PhoneIcon size={13} className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400" />
                  <input placeholder="Phone (optional)" value={ct.phone}
                    onChange={e => setCt({ ...ct, phone: e.target.value })} className={`${inputClass} pl-8`} />
                </div>
              </div>
              <textarea
                rows={4}
                placeholder="What would you like to solve?"
                value={ct.message}
                onChange={e => setCt({ ...ct, message: e.target.value })}
                className={`${inputClass} resize-none`}
              />
              {ctError && <p className="font-sans text-xs font-medium text-red-600">{ctError}</p>}
              <div className="mt-auto flex flex-col gap-3 pt-1 sm:flex-row">
                <button
                  onClick={() => handleContact('demo')}
                  disabled={ctState === 'submitting'}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 py-3 font-sans text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                >
                  {ctState === 'submitting' && ctIntent === 'demo' ? <Loader2 size={15} className="animate-spin" /> : null}
                  Request Demo
                </button>
                <button
                  onClick={() => handleContact('contact')}
                  disabled={ctState === 'submitting'}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-3 font-sans text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 disabled:opacity-60"
                >
                  {ctState === 'submitting' && ctIntent === 'contact' ? <Loader2 size={15} className="animate-spin" /> : null}
                  Contact Sales
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
