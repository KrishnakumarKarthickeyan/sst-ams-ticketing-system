'use client';

import { AppVersion } from '../../../components/ui/app-version';
import { getErrorMessage } from '@/lib/errors';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTickets } from '../../../context/TicketContext';
import { ShieldCheck, User, Building2, Check, Mail, Clock, KeyRound } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
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

export default function CustomerProfilePage() {
  const { user } = useAuth();
  const { contracts } = useTickets();

  // Password Request States
  const [requestLoading, setRequestLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  const customerCompany = user?.company || 'Apex Global Industries';
  const contract = contracts.find(c => c.organizationName === customerCompany);

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
          organization: customerCompany,
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
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink uppercase">
          My Account Profile
        </h1>
        <p className="text-xs text-ink-secondary font-medium">
          Manage your personal support user settings and review organizational SLA contract budgets.
        </p>
      </div>

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
          <div className="space-y-4 text-xs">
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
                Full name changes are read-only. Contact your SAP Account Manager to request adjustments.
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
          <CardTitle className="text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
            <KeyRound size={14} />
            Password Change Request
          </CardTitle>
          <CardDescription className="text-[11px]">
            Request a password reset. A Manager or Admin will review and authorize a temporary password reset.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4 text-xs">
            {pendingRequest ? (
              <div className="bg-amber-50/60 border border-amber-250 rounded-lg p-4 text-[11px] text-amber-800 font-bold space-y-2">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="animate-pulse" />
                  <span>PENDING MANAGER APPROVAL</span>
                </div>
                <p className="font-normal text-ink-secondary font-sans leading-relaxed">
                  A password reset request was submitted on {new Date(pendingRequest.requested_at).toLocaleString()}. You will receive a new temporary password once a Manager or Admin approves your request.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-ink-secondary font-sans leading-relaxed">
                  For security compliance, customers cannot directly change their passwords. Click below to submit a password reset request to your SAP Support Managers.
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
                        Submit a password change request. Your support managers will be notified immediately.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRequestSubmit} className="space-y-4 pt-2">
                      <p className="text-ink-secondary font-sans">
                        Are you sure you want to request a password reset for <strong>{user?.email}</strong>?
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

      {/* Contract card */}
      <Card className="border-line bg-surface shadow-card">
        <CardHeader className="pb-3 border-b border-line bg-surface-muted/60">
          <CardTitle className="text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
            <Building2 size={14} />
            Active Service Contract Pool Summary
          </CardTitle>
          <CardDescription className="text-[11px]">
            Service allocation details and validation records of AMS contracts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4 text-xs">
          {contract ? (
            <div className="space-y-3.5 text-ink-secondary">
              <div className="flex justify-between items-center">
                <span>Contract Type Classification:</span>
                <Badge className="bg-surface-subtle text-ink hover:bg-surface-subtle text-[11px] border-line rounded py-0.5 px-1.5">
                  {contract.contractType}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Contract Validation Ends:</span>
                <span className="font-bold text-ink">{contract.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Services Hours Pool Used:</span>
                <span className="font-bold text-ink">{contract.usedHours} / {contract.totalHours} Hours</span>
              </div>
              
              <div className="space-y-1.5 pt-2 border-t border-line">
                <div className="flex justify-between text-[11px] font-bold text-ink-muted">
                  <span>POOL USAGE BURN RATE</span>
                  <span>{((contract.usedHours / contract.totalHours) * 100).toFixed(1)}% CONSUMED</span>
                </div>
                <div className="w-full h-3.5 bg-surface-subtle border border-line rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ink transition-all duration-300"
                    style={{ width: `${(contract.usedHours / contract.totalHours) * 100}%` }}
                  ></div>
                </div>
                <span className="text-[11px] text-ink-muted block text-right font-bold uppercase mt-1">
                  {contract.totalHours - contract.usedHours} hours remaining
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-ink-muted font-bold uppercase pt-4 border-t border-line">
                <ShieldCheck size={13} className="text-ink-secondary" />
                <span>Security Notice: Mapped under active database Row Level Security (RLS) policies</span>
              </div>
            </div>
          ) : (
            <div className="text-ink-muted italic py-4 text-center">No support contracts currently registered for your company profile.</div>
          )}
        </CardContent>
      </Card>
      <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-ink-muted">
        <span>About this build</span>
        <AppVersion variant="full" />
      </div>
    </div>
  );
}
