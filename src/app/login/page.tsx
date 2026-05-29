'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, ShieldCheck, Mail, Cpu, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { BrandedLogo } from '../../components/ui/BrandedLogo';
import { BRAND_CONFIG } from '../../config/branding';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [showColdStartWarning, setShowColdStartWarning] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (authenticating) {
      timer = setTimeout(() => {
        setShowColdStartWarning(true);
      }, 6000);
    } else {
      setShowColdStartWarning(false);
    }
    return () => clearTimeout(timer);
  }, [authenticating]);

  // Auto redirect to correct dashboard if already logged in
  useEffect(() => {
    if (!loading && user) {
      redirectToDashboard(user.role);
    }
  }, [user, loading]);

  const redirectToDashboard = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        router.push('/admin/dashboard');
        break;
      case 'Manager':
        router.push('/manager/dashboard');
        break;
      case 'Consultant':
        router.push('/consultant/dashboard');
        break;
      case 'Customer':
        router.push('/customer/dashboard');
        break;
      default:
        router.push('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAuthenticating(true);

    if (!email.trim()) {
      setError('Please enter your email address.');
      setAuthenticating(false);
      return;
    }

    const res = await login(email, password);
    if (res.success && res.user) {
      redirectToDashboard(res.user.role);
    } else if (res.success) {
      redirectToDashboard('Customer');
    } else {
      setError(res.error || 'Invalid credentials.');
      setAuthenticating(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError('');
    setAuthenticating(true);
    setEmail(demoEmail);
    setPassword('Manager@12345');
    const res = await login(demoEmail, 'Manager@12345');
    if (res.success) {
      redirectToDashboard('Manager');
    } else {
      setError(res.error || 'Failed to authenticate manager account.');
      setAuthenticating(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-4 bg-zinc-50 relative overflow-hidden py-16 text-[#09090b]">
      
      {/* Brand Header */}
      <div className="w-full max-w-md space-y-6 z-10">
        
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-950 font-mono transition">
          <ArrowLeft size={12} />
          Back to home
        </Link>

        {/* Portal title */}
        <div className="text-center space-y-3">
          <BrandedLogo width={64} height={64} className="mx-auto" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 font-mono uppercase">
              {BRAND_CONFIG.name}
            </h1>
            <p className="text-[10px] text-zinc-500 max-w-xs mx-auto font-mono uppercase tracking-wider mt-1">
              {BRAND_CONFIG.tagline}
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-white border border-zinc-200 rounded-lg p-8 shadow-sm space-y-6 min-h-[280px] flex flex-col justify-center relative overflow-hidden transition-all duration-300">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <BrandedLogo animated={true} width={48} height={48} />
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold font-mono">
                Verifying Credentials...
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-zinc-50 border border-zinc-900 rounded p-3 text-xs text-zinc-900 font-mono font-bold">
                  [ERROR]: {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Email Address</label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g., consultant@sap.com"
                      className="w-full bg-white border border-zinc-200 rounded pl-9 pr-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition font-mono"
                      disabled={authenticating}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Password</label>
                    <Link href="/forgot-password" className="text-[10px] text-zinc-400 hover:text-zinc-950 hover:underline">
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded pl-9 pr-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition font-mono"
                      disabled={authenticating}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-[11px] font-bold text-white rounded transition active:scale-[0.98] uppercase tracking-wider font-mono disabled:opacity-50"
                  disabled={authenticating}
                >
                  {authenticating ? 'Connecting...' : 'Validate & Authenticate'}
                </button>
                {showColdStartWarning && (
                  <p className="text-[9px] text-amber-600 font-bold text-center animate-pulse font-mono uppercase mt-2">
                    ⚠️ Database warming up (Free Tier cold start)... Please wait 10-15s
                  </p>
                )}
              </form>
            </>
          )}

        </div>

        {/* Footer Secure Badge */}
        <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-400 font-mono">
          <ShieldCheck size={11} className="text-zinc-950" />
          <span>SSL 256-bit Decoupled Auth Encryption</span>
        </div>

      </div>

    </main>
  );
}
