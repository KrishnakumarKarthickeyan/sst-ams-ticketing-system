'use client';

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
    } catch (err: any) {
      console.error('Request submit error:', err);
      toast.error(err.message || 'Failed to submit request.', { id: toastId });
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl font-bold tracking-tight font-mono text-zinc-950 uppercase">
          My Account Profile
        </h1>
        <p className="text-xs text-zinc-500 font-medium">
          Manage your personal support user settings and review organizational SLA contract budgets.
        </p>
      </div>

      {/* Account Settings Card */}
      <Card className="border-zinc-200 bg-white shadow-sm">
        <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
            <User size={14} />
            User Metadata Details
          </CardTitle>
          <CardDescription className="text-[11px] font-mono">
            Verify personal details mapping to support logins.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4 font-mono text-xs">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider font-mono">User Full Name</Label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  disabled
                  value={user?.name || ''}
                  className="pl-9 bg-zinc-50 text-zinc-450 text-xs font-mono h-9 cursor-not-allowed border-zinc-200"
                />
              </div>
              <p className="text-[10px] text-zinc-400 font-sans mt-0.5">
                Full name changes are read-only. Contact your SAP Account Manager to request adjustments.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider font-mono">Registered Email Address</Label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="pl-9 bg-zinc-50 text-zinc-450 text-xs font-mono h-9 cursor-not-allowed border-zinc-200"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Request Card */}
      <Card className="border-zinc-200 bg-white shadow-sm">
        <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
            <KeyRound size={14} />
            Password Change Request
          </CardTitle>
          <CardDescription className="text-[11px] font-mono">
            Request a password reset. A Manager or Admin will review and authorize a temporary password reset.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4 font-mono text-xs">
            {pendingRequest ? (
              <div className="bg-amber-50/60 border border-amber-250 rounded-xl p-4 text-[11px] text-amber-800 font-bold space-y-2">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="animate-pulse" />
                  <span>PENDING MANAGER APPROVAL</span>
                </div>
                <p className="font-normal text-zinc-600 font-sans leading-relaxed">
                  A password reset request was submitted on {new Date(pendingRequest.requested_at).toLocaleString()}. You will receive a new temporary password once a Manager or Admin approves your request.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-zinc-600 font-sans leading-relaxed">
                  For security compliance, customers cannot directly change their passwords. Click below to submit a password reset request to your SAP Support Managers.
                </p>
                <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-zinc-950 hover:bg-zinc-800 text-white font-mono font-bold uppercase tracking-wider text-[10px] h-9">
                      Request Password Reset
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border border-zinc-200 font-mono text-xs">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-bold uppercase tracking-wider text-zinc-950">Confirm Password Reset Request</DialogTitle>
                      <DialogDescription className="text-[11px] font-mono text-zinc-500">
                        Submit a password change request. Your support managers will be notified immediately.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRequestSubmit} className="space-y-4 pt-2">
                      <p className="text-zinc-650 font-sans">
                        Are you sure you want to request a password reset for <strong>{user?.email}</strong>?
                      </p>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowRequestDialog(false)}
                          className="font-mono text-[10px] font-bold uppercase h-9"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={requestLoading}
                          className="bg-zinc-950 hover:bg-zinc-800 text-white font-mono font-bold uppercase tracking-wider text-[10px] h-9"
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
      <Card className="border-zinc-200 bg-white shadow-sm">
        <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
            <Building2 size={14} />
            Active Service Contract Pool Summary
          </CardTitle>
          <CardDescription className="text-[11px] font-mono">
            Service allocation details and validation records of AMS contracts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4 font-mono text-xs">
          {contract ? (
            <div className="space-y-3.5 text-zinc-750">
              <div className="flex justify-between items-center">
                <span>Contract Type Classification:</span>
                <Badge className="bg-zinc-100 text-zinc-850 hover:bg-zinc-100 font-mono text-[10px] border-zinc-200 rounded py-0.5 px-1.5">
                  {contract.contractType}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Contract Validation Ends:</span>
                <span className="font-bold text-zinc-950 font-mono">{contract.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Services Hours Pool Used:</span>
                <span className="font-bold text-zinc-950 font-mono">{contract.usedHours} / {contract.totalHours} Hours</span>
              </div>
              
              <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                  <span>POOL USAGE BURN RATE</span>
                  <span>{((contract.usedHours / contract.totalHours) * 100).toFixed(1)}% CONSUMED</span>
                </div>
                <div className="w-full h-3.5 bg-zinc-100 border border-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-950 transition-all duration-300"
                    style={{ width: `${(contract.usedHours / contract.totalHours) * 100}%` }}
                  ></div>
                </div>
                <span className="text-[9px] text-zinc-400 block font-mono text-right font-bold uppercase mt-1">
                  {contract.totalHours - contract.usedHours} hours remaining
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-bold uppercase pt-4 border-t border-zinc-100">
                <ShieldCheck size={13} className="text-zinc-500" />
                <span>Security Notice: Mapped under active database Row Level Security (RLS) policies</span>
              </div>
            </div>
          ) : (
            <div className="text-zinc-400 italic py-4 text-center">No support contracts currently registered for your company profile.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
