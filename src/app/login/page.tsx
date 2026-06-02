'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, ShieldCheck, Mail, ArrowLeft, Activity, Star, ClipboardList, Shield, Globe } from 'lucide-react';
import Link from 'next/link';
import { BrandedLogo } from '../../components/ui/BrandedLogo';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
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

  // Auto redirect to correct dashboard if already logged in
  useEffect(() => {
    if (!loading && user) {
      redirectToDashboard(user.role);
    }
  }, [user, loading]);

  const redirectToDashboard = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        window.location.href = '/admin/dashboard';
        break;
      case 'Manager':
        window.location.href = '/manager/dashboard';
        break;
      case 'Consultant':
        window.location.href = '/consultant/dashboard';
        break;
      case 'Customer':
        window.location.href = '/customer/dashboard';
        break;
      default:
        window.location.href = '/dashboard';
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

  // Mock chart data for Left column preview
  const liveHealthData = [
    { name: '01', compliance: 98.4 },
    { name: '02', compliance: 98.6 },
    { name: '03', compliance: 98.9 },
    { name: '04', compliance: 98.7 },
    { name: '05', compliance: 99.1 }
  ];

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white text-[#111827]">
      
      {/* ── LEFT COLUMN: LARGE COVER AREA & MOCKUP ── */}
      <div className="hidden lg:flex lg:col-span-6 bg-[#F8F9FB] border-r border-[#E5E7EB] p-12 flex-col justify-between relative overflow-hidden">
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#E5E7EB_1px,transparent_1px),linear-gradient(to_bottom,#E5E7EB_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35"></div>
        
        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <BrandedLogo width={24} height={24} />
          <span className="font-bold text-sm tracking-wider text-[#111827] font-mono">ASSIST360</span>
        </div>

        {/* High-Fidelity Product Mockup Center */}
        <div className="relative z-10 max-w-md mx-auto space-y-6 w-full font-sans">
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold uppercase tracking-wider text-[#111827] font-mono">Enterprise Service Management Platform</h2>
            <p className="text-xs text-[#6B7280]">Real-time operational dashboard, SLA trends, and customer satisfaction metrics.</p>
          </div>

          {/* Floating Showcase Mock Cards */}
          <div className="bg-white border border-[#E5E7EB] rounded p-5 shadow-sm space-y-4">
            
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-2 font-mono">
              <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-wider">Service Operations Cockpit</span>
              <Badge className="bg-[#FAFAFA] text-[#10B981] border border-[#E5E7EB] text-[8px] uppercase">System Normal</Badge>
            </div>

            {/* SLA Trend Micro Chart */}
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-[#6B7280] uppercase block">SLA Compliance Trend</span>
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
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded">
                <span className="text-[8px] text-[#6B7280] uppercase block">Platform SLA</span>
                <span className="text-[#2563EB] font-bold block mt-0.5">98.7% Met</span>
              </div>
              <div className="p-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded">
                <span className="text-[8px] text-[#6B7280] uppercase block">Response latency</span>
                <span className="text-[#10B981] font-bold block mt-0.5">8ms latency</span>
              </div>
            </div>

          </div>

          {/* Floating KPI Cards Overlay Stack */}
          <div className="grid grid-cols-2 gap-4">
            
            <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg shadow-sm hover:shadow-md transition duration-300">
              <div className="flex justify-between items-center text-[#6B7280]">
                <span className="text-[9px] font-mono uppercase font-bold tracking-wider">Availability</span>
                <Activity size={12} className="text-[#10B981]" />
              </div>
              <span className="text-lg font-bold font-mono text-[#111827] block mt-1">99.95%</span>
            </div>

            <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg shadow-sm hover:shadow-md transition duration-300">
              <div className="flex justify-between items-center text-[#6B7280]">
                <span className="text-[9px] font-mono uppercase font-bold tracking-wider">Requests</span>
                <ClipboardList size={12} className="text-[#2563EB]" />
              </div>
              <span className="text-lg font-bold font-mono text-[#111827] block mt-1">500K+</span>
            </div>

            <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg shadow-sm hover:shadow-md transition duration-300">
              <div className="flex justify-between items-center text-[#6B7280]">
                <span className="text-[9px] font-mono uppercase font-bold tracking-wider">Compliance</span>
                <ShieldCheck size={12} className="text-[#10B981]" />
              </div>
              <span className="text-lg font-bold font-mono text-[#111827] block mt-1">98.7%</span>
            </div>

            <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg shadow-sm hover:shadow-md transition duration-300">
              <div className="flex justify-between items-center text-[#6B7280]">
                <span className="text-[9px] font-mono uppercase font-bold tracking-wider">Satisfaction</span>
                <Star size={12} className="text-[#F59E0B] fill-[#F59E0B] stroke-none" />
              </div>
              <span className="text-lg font-bold font-mono text-[#111827] block mt-1">95% CSAT</span>
            </div>

          </div>

        </div>

        {/* Footer secure info */}
        <div className="relative z-10 flex items-center gap-1.5 text-[10px] text-[#6B7280] font-mono">
          <ShieldCheck size={12} className="text-[#10B981]" />
          <span>FIPS 140-2 Encrypted Security Standard</span>
        </div>

      </div>

      {/* ── RIGHT COLUMN: AUTHENTICATION CARD ── */}
      <div className="col-span-1 lg:col-span-6 flex flex-col justify-between p-8 md:p-12 min-h-screen bg-white">
        
        {/* Header Back To Home link */}
        <div className="flex justify-between items-center w-full">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#111827] font-mono transition">
            <ArrowLeft size={12} />
            Back to home
          </Link>
          <div className="lg:hidden flex items-center gap-2">
            <BrandedLogo width={20} height={20} />
            <span className="font-bold text-xs tracking-wider text-[#111827] font-mono">ASSIST360</span>
          </div>
        </div>

        {/* Main Authentication card form container */}
        <div className="max-w-sm w-full mx-auto space-y-6 py-12 font-sans">
          
          <div className="text-center lg:text-left space-y-1.5">
            <BrandedLogo width={40} height={40} className="mx-auto lg:mx-0 hidden lg:block" />
            <h1 className="text-2xl font-extrabold tracking-tight text-[#111827] uppercase font-mono mt-3">Sign In</h1>
            <p className="text-xs text-[#6B7280]">Welcome back. Sign in to continue.</p>
          </div>

          <Card className="p-6 border-[#E5E7EB] bg-white rounded shadow-sm relative min-h-[300px] flex flex-col justify-center">
            
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <BrandedLogo animated={true} width={40} height={40} />
                <span className="text-[10px] uppercase font-mono font-bold text-[#6B7280] tracking-widest text-center block">
                  Establishing secure tunnel...
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
                
                {error && (
                  <div className="bg-[#FAFAFA] border border-[#EF4444] rounded p-3 text-xs text-[#EF4444] font-mono">
                    <span className="font-bold">Login Error:</span> {error}
                  </div>
                )}

                {/* Email input field */}
                <div className="space-y-1">
                  <label className="font-bold text-[#111827] uppercase tracking-wider text-[9px]">Email Address</label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                    <input 
                      required
                      type="email"
                      placeholder="username@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded pl-9 pr-3 py-2.5 text-xs text-[#111827] placeholder:text-[#6B7280] focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] transition"
                      disabled={authenticating}
                    />
                  </div>
                </div>

                {/* Password input field */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-[#111827] uppercase tracking-wider text-[9px]">Password</label>
                    <Link href="/forgot-password" className="text-[9px] text-[#6B7280] hover:text-[#111827] hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                    <input 
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded pl-9 pr-3 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827] transition"
                      disabled={authenticating}
                    />
                  </div>
                </div>

                {/* Remember Me switch */}
                <div className="flex items-center gap-2 pt-1 font-sans text-xs text-[#6B7280]">
                  <input 
                    type="checkbox" 
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#E5E7EB] text-[#111827] focus:ring-[#111827] w-3.5 h-3.5 cursor-pointer"
                  />
                  <label htmlFor="remember" className="cursor-pointer select-none">Remember Me</label>
                </div>

                {/* Action submit button */}
                <Button 
                  type="submit"
                  disabled={authenticating}
                  className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 text-[10px] font-bold text-white rounded transition active:scale-[0.98] uppercase tracking-wider font-mono border-none"
                >
                  {authenticating ? 'Verifying...' : 'Sign In'}
                </Button>

              </form>
            )}

          </Card>

        </div>

        {/* Footer Secure Badge */}
        <div className="text-center text-[10px] text-[#6B7280] font-mono flex items-center justify-center gap-1.5">
          <span>Copyright © Support Studio Technologies. All Rights Reserved.</span>
        </div>

      </div>

    </main>
  );
}
