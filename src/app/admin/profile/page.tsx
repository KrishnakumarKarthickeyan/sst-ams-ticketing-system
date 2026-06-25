'use client';

import { AppVersion } from '../../../components/ui/app-version';
import { getErrorMessage } from '@/lib/errors';
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ShieldCheck, User, Check, Mail, KeyRound, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { supabase } from '../../../lib/supabase/client';
import { logUserAuditAction } from '../../actions/auth';
import { toast } from 'sonner';

export default function AdminProfilePage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [success, setSuccess] = useState(false);

  // Password States
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateProfile(name);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordUpdating(true);
    const toastId = toast.loading('Updating security credentials...');

    try {
      // 1. Update Supabase Auth
      const { error: authErr } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authErr) throw authErr;

      // 2. Save Audit Record
      if (user?.email) {
        await logUserAuditAction(user.email, 'Password Update', user.email);
      }

      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmNewPassword('');
      toast.success('Password updated successfully.', { id: toastId });
    } catch (err: unknown) {
      console.error('Password change error:', err);
      setPasswordError(getErrorMessage(err) || 'Failed to update password.');
      toast.error('Failed to change password.', { id: toastId });
    } finally {
      setPasswordUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="border-b border-line pb-4">
        <h1 className="type-title text-ink">
          Super Admin Profile
        </h1>
        <p className="text-xs text-ink-secondary font-medium">
          Manage your administrative profile settings and password credentials.
        </p>
      </div>

      {success && (
        <div className="bg-ink text-white border border-zinc-900 rounded-lg p-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          <span>Profile Name Updated Successfully</span>
        </div>
      )}

      {/* Account Settings Card */}
      <Card className="border-line bg-surface shadow-card">
        <CardHeader className="pb-3 border-b border-line bg-surface-muted/60">
          <CardTitle className="text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
            <User size={14} />
            User Metadata Details
          </CardTitle>
          <CardDescription className="text-[11px]">
            Verify personal details mapping to support logins.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">User Full Name</Label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Registered Email Address</Label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <Input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="pl-9 bg-surface-muted text-ink-muted text-xs h-9 cursor-not-allowed border-line"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" className="bg-ink hover:bg-zinc-800 text-white font-bold uppercase tracking-wider text-[11px] h-9">
                Update Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Update Card */}
      <Card className="border-line bg-surface shadow-card">
        <CardHeader className="pb-3 border-b border-line bg-surface-muted/60">
          <CardTitle className="text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
            <KeyRound size={14} />
            Update Password Credentials
          </CardTitle>
          <CardDescription className="text-[11px]">
            Change your password. After saving, the old password will stop working immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handlePasswordUpdate} className="space-y-4 text-xs">
            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded p-2.5 text-[11px] text-red-800 font-bold">
                [ERROR]: {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-ink text-white border border-zinc-900 rounded p-2.5 text-[11px] font-bold flex items-center gap-1.5">
                <Check size={12} className="text-emerald-400" />
                <span>Password changed and audit log registered.</span>
              </div>
            )}
            
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">New Password</Label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <Input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9 text-xs h-9"
                  placeholder="Min. 6 characters"
                  disabled={passwordUpdating}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Confirm New Password</Label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <Input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="pl-9 text-xs h-9"
                  placeholder="Re-type new password"
                  disabled={passwordUpdating}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button 
                type="submit" 
                className="bg-ink hover:bg-zinc-800 text-white font-bold uppercase tracking-wider text-[11px] h-9"
                disabled={passwordUpdating}
              >
                {passwordUpdating ? 'Updating...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-ink-muted">
        <span>About this build</span>
        <AppVersion variant="full" />
      </div>
    </div>
  );
}
