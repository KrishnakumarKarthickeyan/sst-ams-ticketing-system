'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, ShieldCheck, ArrowRight, Lock } from 'lucide-react';
import { BrandedLogo } from '../../components/ui/BrandedLogo';
import { BRAND_CONFIG } from '../../config/branding';
import { supabase } from '../../lib/supabase/client';
import { toast } from 'sonner';

export default function FirstLoginResetPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.firstLoginCompleted === true) {
        redirectToDashboard(user.role);
      }
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
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setUpdating(true);
    const toastId = toast.loading('Securing your new credentials...');

    try {
      // 1. Update Auth password and user metadata
      const { error: authErr } = await supabase.auth.updateUser({
        password: password,
        data: { first_login_completed: true }
      });

      if (authErr) throw authErr;

      // 2. Update profiles table
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({
          first_login_completed: true,
          password_changed_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (dbErr) throw dbErr;

      toast.success('Security settings initialized. Redirecting to workspace...', { id: toastId });
      
      // Delay briefly to allow session to refresh
      setTimeout(() => {
        if (user) {
          redirectToDashboard(user.role);
        }
      }, 1000);

    } catch (err: any) {
      console.error('Password reset failure:', err);
      setError(err.message || 'An error occurred during password update.');
      setUpdating(false);
      toast.error('Failed to update credentials.', { id: toastId });
    }
  };

  if (loading || !user) {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center px-4 bg-zinc-50 font-mono text-xs">
        <BrandedLogo animated={true} width={48} height={48} />
        <div className="mt-4 uppercase tracking-widest text-zinc-550 font-bold">
          Verifying security context...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-4 bg-zinc-50 relative overflow-hidden py-16 text-[#09090b]">
      <div className="w-full max-w-md space-y-6 z-10">
        
        {/* Portal title */}
        <div className="text-center space-y-3">
          <BrandedLogo width={64} height={64} className="mx-auto" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 font-mono uppercase">
              Security Setup Required
            </h1>
            <p className="text-[10px] text-zinc-550 max-w-xs mx-auto font-mono uppercase tracking-wider mt-1">
              Initialize password credentials to enter the workspace
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-zinc-200 rounded-lg p-8 shadow-sm space-y-6">
          <div className="bg-zinc-50 border border-zinc-200 rounded p-4 text-xs font-mono text-zinc-700 space-y-1.5">
            <div className="font-bold flex items-center gap-1 text-zinc-950 uppercase text-[10px]">
              <Lock size={12} />
              Initial Login Enforcement
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-550">
              Welcome to the **{BRAND_CONFIG.name}**. You are logged in with an initial administrative password. You must update your password to secure your account before proceeding.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800 font-mono font-bold">
              [SECURITY ERROR]: {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">New Password</label>
              <div className="relative">
                <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-white border border-zinc-200 rounded pl-9 pr-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition font-mono"
                  disabled={updating}
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Confirm Password</label>
              <div className="relative">
                <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-white border border-zinc-200 rounded pl-9 pr-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition font-mono"
                  disabled={updating}
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-[11px] font-bold text-white rounded transition active:scale-[0.98] uppercase tracking-wider font-mono flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                disabled={updating}
              >
                <span>Save Credentials & Login</span>
                <ArrowRight size={13} />
              </button>
              
              <button
                type="button"
                onClick={logout}
                className="w-full py-2 border border-zinc-250 hover:border-zinc-950 text-[10px] text-zinc-650 hover:text-zinc-950 rounded transition uppercase tracking-wider font-mono cursor-pointer"
                disabled={updating}
              >
                Sign Out
              </button>
            </div>
          </form>
        </div>

        {/* Secure Badge */}
        <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-450 font-mono">
          <ShieldCheck size={11} className="text-zinc-950" />
          <span>AES-256 Administrative Vault Lock</span>
        </div>
      </div>
    </main>
  );
}
