'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTickets } from '../../../context/TicketContext';
import { ShieldCheck, User, Building2, Check, Mail, Award, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';

export default function CustomerProfilePage() {
  const { user, updateProfile } = useAuth();
  const { contracts } = useTickets();
  const [name, setName] = useState(user?.name || '');
  const [success, setSuccess] = useState(false);

  const customerCompany = user?.company || 'Apex Global Industries';
  const contract = contracts.find(c => c.organizationName === customerCompany);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateProfile(name);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
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

      {success && (
        <div className="bg-zinc-950 text-white border border-zinc-900 rounded-lg p-4 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          <span>Profile Name Updated Successfully</span>
        </div>
      )}

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
          <form onSubmit={handleUpdate} className="space-y-4 font-mono text-xs">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider font-mono">User Full Name</Label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 text-xs font-mono h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider font-mono">Registered Email Address</Label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="pl-9 bg-zinc-50 text-zinc-400 text-xs font-mono h-9 cursor-not-allowed border-zinc-200"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" className="bg-zinc-950 hover:bg-zinc-800 text-white font-mono font-bold uppercase tracking-wider text-[10px] h-9">
                Update Settings
              </Button>
            </div>
          </form>
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
