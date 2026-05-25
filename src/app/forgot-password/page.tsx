'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, ShieldAlert } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    // Simulate API request
    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
    }, 1000);
  };

  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-4 bg-zinc-50 relative overflow-hidden py-16 text-[#09090b]">
      <div className="w-full max-w-md space-y-6 z-10 font-mono text-xs">
        
        {/* Back link */}
        <Link href="/login" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-950 font-mono transition">
          <ArrowLeft size={12} />
          Back to login
        </Link>

        {/* Form Card */}
        <div className="bg-white border border-zinc-200 rounded-lg p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 uppercase font-mono">
              Password Reset
            </h1>
            <p className="text-zinc-500 max-w-xs mx-auto leading-normal">
              Enter your enterprise email, and we will dispatch a secure validation recovery link.
            </p>
          </div>

          {success ? (
            <div className="bg-zinc-55 border border-zinc-900 rounded p-4 text-center space-y-3">
              <span className="font-bold text-zinc-950 uppercase block">Reset Link Dispatched</span>
              <p className="text-zinc-500 leading-normal">
                If the email exists in our records, a secure login code will arrive shortly.
              </p>
              <Link
                href="/login"
                className="inline-block px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded text-[10px] font-bold uppercase tracking-wider transition"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Email Address</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. customer@sap.com"
                    className="w-full bg-white border border-zinc-200 rounded pl-9 pr-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition font-mono"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-[11px] font-bold text-white rounded transition active:scale-[0.98] uppercase tracking-wider font-mono disabled:opacity-50"
                disabled={loading || !email}
              >
                {loading ? 'Dispatched Request...' : 'Send Recovery Code'}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-zinc-100 flex items-start gap-2 text-zinc-400 leading-normal">
            <ShieldAlert size={16} className="text-zinc-500 shrink-0" />
            <p className="text-[10px]">
              Note: System registration is invitation-only. Self-signup is disabled by policy. Contact your BASIS admin.
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}
