'use client';

import { getErrorMessage } from '@/lib/errors';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, ShieldCheck, ArrowRight, Lock, CheckCircle2, Circle } from 'lucide-react';
import { BrandedLogo } from '../../components/ui/BrandedLogo';
import { BRAND_CONFIG } from '../../config/branding';
import { supabase } from '../../lib/supabase/client';
import { toast } from 'sonner';
import { logUserAuditAction } from '../actions/auth';

export default function FirstLoginResetPage() {
  const { user, loading, logout, refreshProfile } = useAuth();
  const router = useRouter();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  // Password policy checks
  const hasMinLength = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?]/.test(password);
  
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  const redirectIssuedRef = React.useRef(false);

  useEffect(() => {
    if (loading || redirectIssuedRef.current) return;
    if (!user) {
      redirectIssuedRef.current = true;
      router.replace('/login');
      return;
    }
    if (user.firstLoginCompleted === true && user.forcePasswordChange !== true) {
      redirectIssuedRef.current = true;
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
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isPasswordValid) {
      setError('Password does not meet the complexity requirements.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setUpdating(true);
    const toastId = toast.loading('Securing your new credentials...');

    try {
      const apiRes = await fetch('/api/users/set-new-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: password })
      });

      const resData = await apiRes.json();
      if (!apiRes.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to update credentials.');
      }

      // Force context refresh
      const refreshedUser = await refreshProfile();

      // Enforce 350ms delay to allow Supabase cookie flush before triggering middleware redirects
      await new Promise(resolve => setTimeout(resolve, 350));

      toast.success('Security settings initialized. Redirecting to workspace...', { id: toastId });
      
      // Redirect immediately using refreshed state
      if (refreshedUser) {
        redirectToDashboard(refreshedUser.role);
      } else if (user) {
        redirectToDashboard(user.role);
      }

    } catch (err: unknown) {
      console.error('Password reset failure:', err);
      setError(getErrorMessage(err) || 'An error occurred during password update.');
      setUpdating(false);
      toast.error('Failed to update credentials.', { id: toastId });
    }
  };

  if (loading || !user) {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center px-4 bg-surface-muted text-xs">
        <BrandedLogo animated={true} width={48} height={48} />
        <div className="mt-4 uppercase tracking-widest text-ink-secondary font-bold animate-pulse">
          Verifying security context...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-4 bg-surface-muted relative overflow-hidden py-16 text-ink">
      <div className="w-full max-w-md space-y-6 z-10">
        
        {/* Portal title */}
        <div className="text-center space-y-3">
          <BrandedLogo width={64} height={64} className="mx-auto" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink uppercase">
              Security Setup Required
            </h1>
            <p className="text-[11px] text-ink-secondary max-w-xs mx-auto uppercase tracking-wider mt-1">
              Initialize password credentials to enter the workspace
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-surface border border-line rounded-lg p-8 shadow-card space-y-6">
          <div className="bg-surface-muted border border-line rounded p-4 text-xs text-ink-secondary space-y-1.5">
            <div className="font-bold flex items-center gap-1 text-ink uppercase text-[11px]">
              <Lock size={12} />
              Initial Login Enforcement
            </div>
            <p className="text-[11px] leading-relaxed text-ink-secondary">
              Welcome to the **{BRAND_CONFIG.name}**. You are logged in with an initial administrative password. You must update your password to secure your account before proceeding.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800 font-bold">
              [SECURITY ERROR]: {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="font-bold text-ink-secondary uppercase tracking-wider text-[11px]">New Password</label>
              <div className="relative">
                <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full bg-surface border border-line rounded pl-9 pr-3.5 py-2 text-xs text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition"
                  disabled={updating}
                  required
                />
              </div>
            </div>

            {/* Realtime Password Policy Validation Visual */}
            <div className="bg-surface-muted border border-line rounded p-3.5 space-y-2 text-[11px]">
              <span className="font-bold uppercase tracking-wider text-ink-secondary text-[11px] block mb-1">Password Complexity Rules:</span>
              <div className="grid grid-cols-2 gap-2 text-ink-secondary">
                <div className="flex items-center gap-1.5">
                  {hasMinLength ? (
                    <CheckCircle2 size={12} className="text-success shrink-0" />
                  ) : (
                    <Circle size={12} className="text-ink-muted shrink-0" />
                  )}
                  <span className={hasMinLength ? 'text-emerald-700 font-medium' : ''}>Min. 8 characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasUppercase ? (
                    <CheckCircle2 size={12} className="text-success shrink-0" />
                  ) : (
                    <Circle size={12} className="text-ink-muted shrink-0" />
                  )}
                  <span className={hasUppercase ? 'text-emerald-700 font-medium' : ''}>Uppercase letter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasLowercase ? (
                    <CheckCircle2 size={12} className="text-success shrink-0" />
                  ) : (
                    <Circle size={12} className="text-ink-muted shrink-0" />
                  )}
                  <span className={hasLowercase ? 'text-emerald-700 font-medium' : ''}>Lowercase letter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasNumber ? (
                    <CheckCircle2 size={12} className="text-success shrink-0" />
                  ) : (
                    <Circle size={12} className="text-ink-muted shrink-0" />
                  )}
                  <span className={hasNumber ? 'text-emerald-700 font-medium' : ''}>Number digit</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  {hasSpecial ? (
                    <CheckCircle2 size={12} className="text-success shrink-0" />
                  ) : (
                    <Circle size={12} className="text-ink-muted shrink-0" />
                  )}
                  <span className={hasSpecial ? 'text-emerald-700 font-medium' : ''}>Special character (!@#$%)</span>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="font-bold text-ink-secondary uppercase tracking-wider text-[11px]">Confirm Password</label>
              <div className="relative">
                <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-surface border border-line rounded pl-9 pr-3.5 py-2 text-xs text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition"
                  disabled={updating}
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-ink hover:bg-zinc-800 text-[11px] font-bold text-white rounded transition active:scale-[0.98] uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                disabled={updating || !isPasswordValid}
              >
                <span>Save Credentials & Login</span>
                <ArrowRight size={13} />
              </button>
              
              <button
                type="button"
                onClick={logout}
                className="w-full py-2 border border-line hover:border-line-strong text-[11px] text-ink-secondary hover:text-ink rounded transition uppercase tracking-wider cursor-pointer"
                disabled={updating}
              >
                Sign Out
              </button>
            </div>
          </form>
        </div>

        {/* Secure Badge */}
        <div className="flex items-center justify-center gap-1 text-[11px] text-ink-muted">
          <ShieldCheck size={11} className="text-ink" />
          <span>AES-256 Administrative Vault Lock</span>
        </div>
      </div>
    </main>
  );
}
