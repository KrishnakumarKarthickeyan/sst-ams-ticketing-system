'use client';

import { AppVersion } from '../../../components/ui/app-version';
import { getErrorMessage } from '@/lib/errors';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ShieldCheck, User, Check, Mail, Clock, KeyRound } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { supabase } from '../../../lib/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from '../../../components/ui/dialog';

export default function ManagerProfilePage() {
  const { user } = useAuth();
  const [requestLoading, setRequestLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  const managerCompany = user?.company || 'Assist360 Operations';

  const fetchPendingRequest = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('password_change_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'Pending')
        .maybeSingle();

      if (!error && data) {
        setPendingRequest(data);
      } else {
        setPendingRequest(null);
      }
    } catch (err) {
      console.error('Error fetching pending request:', err);
    }
  };

  useEffect(() => {
    fetchPendingRequest();
  }, [user?.id]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setRequestLoading(true);
    const toastId = toast.loading('Submitting password change request...');
    try {
      const { data, error } = await supabase
        .from('password_change_requests')
        .insert({
          user_id: user.id,
          requester_email: user.email || '',
          requester_name: user.name || '',
          organization: managerCompany,
          status: 'Pending'
        })
        .select()
        .single();

      if (error) throw error;
      setPendingRequest(data);
      setShowRequestDialog(false);
      toast.success('Password change request submitted successfully.', { id: toastId });
    } catch (err: unknown) {
      console.error('Request submit error:', err);
      toast.error(getErrorMessage(err) || 'Failed to submit request.', { id: toastId });
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto text-xs">
      {/* Header */}
      <div className="border-b border-line pb-4">
        <h1 className="type-title text-ink">
          Manager Profile
        </h1>
        <p className="text-xs text-ink-secondary font-medium">
          Manage your personal manager profile settings and password credentials.
        </p>
      </div>

      {/* Account Settings Card */}
      <Card className="border-line bg-surface shadow-card">
        <CardHeader className="pb-3 border-b border-line bg-surface-muted/60">
          <CardTitle className="text-xs uppercase tracking-wider text-ink flex items-center gap-1.5 font-bold">
            <User size={14} />
            User Metadata Details
          </CardTitle>
          <CardDescription className="text-[11px]">
            Verify personal details mapping to support logins.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">User Full Name</Label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <Input
                  type="text"
                  disabled
                  value={user?.name || ''}
                  className="pl-9 bg-surface-muted text-ink-muted text-xs h-9 cursor-not-allowed border-line"
                />
              </div>
              <p className="text-[11px] text-ink-muted font-sans mt-0.5">
                Full name changes are read-only. Contact SuperAdmin to request adjustments.
              </p>
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
          </div>
        </CardContent>
      </Card>

      {/* Password Request Card */}
      <Card className="border-line bg-surface shadow-card">
        <CardHeader className="pb-3 border-b border-line bg-surface-muted/60">
          <CardTitle className="text-xs uppercase tracking-wider text-ink flex items-center gap-1.5 font-bold">
            <KeyRound size={14} />
            Password Change Request
          </CardTitle>
          <CardDescription className="text-[11px]">
            Request a password reset. A SuperAdmin will review and authorize a temporary password reset.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {pendingRequest ? (
              <div className="bg-amber-50/60 border border-amber-250 rounded-lg p-4 text-[11px] text-amber-800 font-bold space-y-2">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="animate-pulse" />
                  <span>PENDING SUPERADMIN APPROVAL</span>
                </div>
                <p className="font-normal text-ink-secondary font-sans leading-relaxed">
                  A password reset request was submitted on {new Date(pendingRequest.requested_at).toLocaleString()}. You will receive a new temporary password once a SuperAdmin approves your request.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-ink-secondary font-sans leading-relaxed">
                  For security compliance, managers cannot directly change their passwords. Click below to submit a password reset request to your SuperAdmin queue.
                </p>
                <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-ink hover:bg-zinc-800 text-white font-bold uppercase tracking-wider text-[11px] h-9">
                      Request Password Reset
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-surface border border-line text-xs">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-bold uppercase tracking-wider text-ink">Confirm Password Reset Request</DialogTitle>
                      <DialogDescription className="text-[11px] text-ink-secondary">
                        Submit a password change request. SuperAdmins will be notified immediately.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRequestSubmit} className="space-y-4 pt-2">
                      <p className="text-ink-secondary font-sans">
                        Are you sure you want to request a password reset for manager <strong>{user?.email}</strong>?
                      </p>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowRequestDialog(false)}
                          className="text-[11px] font-bold uppercase h-9"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={requestLoading}
                          className="bg-ink hover:bg-zinc-800 text-white font-bold uppercase tracking-wider text-[11px] h-9"
                        >
                          {requestLoading ? 'Submitting...' : 'Confirm Request'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-ink-muted">
        <span>About this build</span>
        <AppVersion variant="full" />
      </div>
    </div>
  );
}
