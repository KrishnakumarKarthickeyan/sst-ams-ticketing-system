'use client';

import { getErrorMessage } from '@/lib/errors';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, ShieldCheck, Mail, ArrowLeft, Activity, Star, ClipboardList, Shield, Globe } from 'lucide-react';
import Link from 'next/link';
import { BrandedLogo } from '../../components/ui/BrandedLogo';
import { AppVersion } from '../../components/ui/app-version';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog';
import {
  AreaChart,
  Area,
  ResponsiveContainer
} from 'recharts';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const redirectIssuedRef = React.useRef(false);

  // Auto redirect to correct dashboard if already logged in
  useEffect(() => {
    if (!loading && user && !authenticating && !redirectIssuedRef.current) {
      redirectIssuedRef.current = true;
      redirectToDashboard(user);
    }
  }, [user, loading, authenticating]);

  const redirectToDashboard = (sessionUser: any) => {
    const isForce = sessionUser.forcePasswordChange === true || sessionUser.firstLoginCompleted === false;
    let target = '/dashboard';
    if (isForce) {
      target = '/first-login-reset';
    } else {
      switch (sessionUser.role) {
        case 'SuperAdmin': target = '/admin/dashboard'; break;
        case 'Manager':    target = '/manager/dashboard'; break;
        case 'Consultant': target = '/consultant/dashboard'; break;
        case 'Customer':   target = '/customer/dashboard'; break;
      }
    }
    // Hard navigation ensures cookies are committed and avoids router.push+refresh race
    window.location.href = target;
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

    let timedOut = false;
    // Slightly above AuthContext's 10s auth timeout, so the context's precise
    // error surfaces first instead of this generic one racing ahead of it.
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setError('Login is taking longer than expected. Please try again.');
      setAuthenticating(false);
    }, 12000);

    try {
      const res = await login(email, password);
      clearTimeout(timeoutId);

      if (timedOut) return;

      if (res.success && res.user) {
        // Wait for the auth cookie to be written to document.cookie
        const hasCookie = () => document.cookie.split(';').some(c => c.trim().startsWith('sb-'));
        if (!hasCookie()) {
          for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 50));
            if (hasCookie()) break;
          }
        }
        
        redirectToDashboard(res.user);
      } else {
        setError(res.error || 'Invalid credentials.');
        setAuthenticating(false);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (!timedOut) {
        console.error('Login submission error:', err);
        setError(getErrorMessage(err) || 'An unexpected authentication error occurred.');
        setAuthenticating(false);
      }
    }
  };

  // Mock chart data for Left column preview
  const liveHealthData = [
    { name: '01', compliance: 98.4 },
    { name: '02', compliance: 98.6 },
    { name: '03', compliance: 98.9 },
    { name: '04', compliance: 98.7 },
    { name: '05', compliance: 99.1 }
  ];

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-surface text-ink">
      
      {/* ── LEFT COLUMN: LARGE COVER AREA & MOCKUP ── */}
      <div className="hidden lg:flex lg:col-span-6 bg-surface-muted border-r border-line p-12 flex-col justify-between relative overflow-hidden">
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#E5E7EB_1px,transparent_1px),linear-gradient(to_bottom,#E5E7EB_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35"></div>
        
        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <BrandedLogo width={24} height={24} />
          <span className="font-bold text-sm tracking-wider text-ink">ASSIST360</span>
        </div>

        {/* High-Fidelity Product Mockup Center */}
        <div className="relative z-10 max-w-md mx-auto space-y-6 w-full font-sans">
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold uppercase tracking-wider text-ink">Enterprise Service Management Platform</h2>
            <p className="text-xs text-ink-secondary">Real-time operational dashboard, SLA trends, and customer satisfaction metrics.</p>
          </div>

          {/* Floating Showcase Mock Cards */}
          <div className="bg-surface border border-line rounded p-5 shadow-card space-y-4">
            
            <div className="flex justify-between items-center border-b border-line pb-2">
              <span className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Service Operations Cockpit</span>
              <Badge className="bg-surface-muted text-success border border-line text-[11px] uppercase">System Normal</Badge>
            </div>

            {/* SLA Trend Micro Chart */}
            <div className="space-y-1">
              <span className="text-[11px] text-ink-secondary uppercase block">SLA Compliance Trend</span>
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={liveHealthData} margin={{ top: 0, right: 0, left: -40, bottom: 0 }}>
                    <defs>
                      <linearGradient id="loginChartGradLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="compliance" stroke="#2563EB" strokeWidth={2} fill="url(#loginChartGradLight)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Floating KPI Cards Grid inside mockup */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-surface-muted border border-line rounded">
                <span className="text-[11px] text-ink-secondary uppercase block">Platform SLA</span>
                <span className="text-brand font-bold block mt-0.5">98.7% Met</span>
              </div>
              <div className="p-2.5 bg-surface-muted border border-line rounded">
                <span className="text-[11px] text-ink-secondary uppercase block">Response latency</span>
                <span className="text-success font-bold block mt-0.5">8ms latency</span>
              </div>
            </div>

          </div>

          {/* Floating KPI Cards Overlay Stack */}
          <div className="grid grid-cols-2 gap-4">
            
            <div className="p-4 bg-surface border border-line rounded-lg shadow-card hover:shadow-md transition duration-300">
              <div className="flex justify-between items-center text-ink-secondary">
                <span className="text-[11px] uppercase font-bold tracking-wider">Availability</span>
                <Activity size={12} className="text-success" />
              </div>
              <span className="text-lg font-bold text-ink block mt-1">99.95%</span>
            </div>

            <div className="p-4 bg-surface border border-line rounded-lg shadow-card hover:shadow-md transition duration-300">
              <div className="flex justify-between items-center text-ink-secondary">
                <span className="text-[11px] uppercase font-bold tracking-wider">Requests</span>
                <ClipboardList size={12} className="text-brand" />
              </div>
              <span className="text-lg font-bold text-ink block mt-1">500K+</span>
            </div>

            <div className="p-4 bg-surface border border-line rounded-lg shadow-card hover:shadow-md transition duration-300">
              <div className="flex justify-between items-center text-ink-secondary">
                <span className="text-[11px] uppercase font-bold tracking-wider">Compliance</span>
                <ShieldCheck size={12} className="text-success" />
              </div>
              <span className="text-lg font-bold text-ink block mt-1">98.7%</span>
            </div>

            <div className="p-4 bg-surface border border-line rounded-lg shadow-card hover:shadow-md transition duration-300">
              <div className="flex justify-between items-center text-ink-secondary">
                <span className="text-[11px] uppercase font-bold tracking-wider">Satisfaction</span>
                <Star size={12} className="text-warning fill-warning stroke-none" />
              </div>
              <span className="text-lg font-bold text-ink block mt-1">95% CSAT</span>
            </div>

          </div>

        </div>

        {/* Footer secure info */}
        <div className="relative z-10 flex items-center gap-1.5 text-[11px] text-ink-secondary">
          <ShieldCheck size={12} className="text-success" />
          <span>FIPS 140-2 Encrypted Security Standard</span>
        </div>

      </div>

      {/* ── RIGHT COLUMN: AUTHENTICATION CARD ── */}
      <div className="col-span-1 lg:col-span-6 flex flex-col justify-between p-8 md:p-12 min-h-screen bg-surface">
        
        {/* Header Back To Home link */}
        <div className="flex justify-between items-center w-full">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink transition">
            <ArrowLeft size={12} />
            Back to home
          </Link>
          <div className="lg:hidden flex items-center gap-2">
            <BrandedLogo width={20} height={20} />
            <span className="font-bold text-xs tracking-wider text-ink">ASSIST360</span>
          </div>
        </div>

        {/* Main Authentication card form container */}
        <div className="max-w-sm w-full mx-auto space-y-6 py-12 font-sans">
          
          <div className="text-center lg:text-left space-y-1.5">
            <BrandedLogo width={40} height={40} className="mx-auto lg:mx-0 hidden lg:block" />
            <h1 className="type-title text-ink mt-3">Sign In</h1>
            <p className="text-xs text-ink-secondary">Welcome back. Sign in to continue.</p>
          </div>

          <Card className="p-6 border-line bg-surface rounded shadow-card relative min-h-[300px] flex flex-col justify-center">
            
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <BrandedLogo animated={true} width={40} height={40} />
                <span className="text-[11px] uppercase font-bold text-ink-secondary tracking-widest text-center block">
                  Establishing secure tunnel...
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                {error && (
                  <div className="bg-surface-muted border border-critical-border rounded p-3 text-xs text-critical">
                    <span className="font-bold">Login Error:</span> {error}
                  </div>
                )}

                {/* Email input field */}
                <div className="space-y-1">
                  <label className="font-bold text-ink uppercase tracking-wider text-[11px]">Email Address</label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
                    <input 
                      required
                      type="email"
                      placeholder="username@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-muted border border-line rounded pl-9 pr-3 py-2.5 text-xs text-ink placeholder:text-ink-secondary focus:outline-none focus:border-ink focus:ring-1 focus:ring-brand/30 transition"
                      disabled={authenticating}
                    />
                  </div>
                </div>

                {/* Password input field */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-ink uppercase tracking-wider text-[11px]">Password</label>
                    <button
                      type="button"
                      onClick={() => setForgotPasswordOpen(true)}
                      className="text-[11px] text-ink-secondary hover:text-ink hover:underline bg-transparent border-none cursor-pointer p-0"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
                    <input 
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-surface-muted border border-line rounded pl-9 pr-3 py-2.5 text-xs text-ink focus:outline-none focus:border-ink focus:ring-1 focus:ring-brand/30 transition"
                      disabled={authenticating}
                    />
                  </div>
                </div>

                {/* Remember Me switch */}
                <div className="flex items-center gap-2 pt-1 font-sans text-xs text-ink-secondary">
                  <input 
                    type="checkbox" 
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-line text-ink focus:ring-brand/30 w-3.5 h-3.5 cursor-pointer"
                  />
                  <label htmlFor="remember" className="cursor-pointer select-none">Remember Me</label>
                </div>

                {/* Action submit button */}
                <Button 
                  type="submit"
                  disabled={authenticating}
                  className="w-full py-2.5 bg-brand hover:bg-blue-700 text-[11px] font-bold text-white rounded transition active:scale-[0.98] uppercase tracking-wider border-none"
                >
                  {authenticating ? 'Verifying...' : 'Sign In'}
                </Button>

              </form>
            )}

          </Card>

        </div>

        {/* Footer Secure Badge */}
        <div className="text-center text-[11px] text-ink-secondary flex flex-col items-center justify-center gap-1">
          <span>Copyright &copy; {new Date().getFullYear()} Assist360. All Rights Reserved.</span>
          <AppVersion variant="full" />
        </div>

      </div>

      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="max-w-md bg-surface border border-line shadow-lg p-6 rounded-lg text-xs">
          <DialogHeader className="space-y-1 text-center sm:text-left">
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-ink">
              Password Reset Required
            </DialogTitle>
            <DialogDescription className="text-[11px] text-ink-secondary pt-2 leading-relaxed">
              Please contact your Super Admin to reset your password.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end">
            <Button
              onClick={() => setForgotPasswordOpen(false)}
              className="px-4 py-2 bg-ink hover:bg-zinc-800 text-white rounded text-[11px] font-bold uppercase tracking-wider transition border-none cursor-pointer"
            >
              Okay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  );
}
