'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Copy, CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { provisionUser } from '../../app/actions/auth';
import { consultantCreateSchema } from '../../lib/schemas/consultant';

/**
 * Shared Create Consultant dialog used by BOTH the SuperAdmin and Manager
 * Users areas. The single source of consultant-creation form logic — it calls
 * the shared provisionUser server action (which guards SuperAdmin + Manager and
 * writes the consultant profile). No forked logic per role.
 */

const SAP_MODULES = ['FICO', 'MM', 'SD', 'PP', 'PM', 'QM', 'HCM', 'BASIS', 'ABAP', 'SF EC', 'SF ECP', 'SF PMGM', 'SF RCM', 'SAC', 'CPI'];

const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  performedBy?: string;
  onCreated?: () => void;
}

export function CreateConsultantDialog({ open, onOpenChange, performedBy, onCreated }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<'Functional' | 'Technical'>('Functional');
  const [specialization, setSpecialization] = useState('');
  const [modules, setModules] = useState<string[]>([]);
  const [staffId, setStaffId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [pwdMode, setPwdMode] = useState<'auto' | 'manual'>('auto');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [emailError, setEmailError] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  const reset = () => {
    setFullName(''); setEmail(''); setPhone(''); setType('Functional'); setSpecialization('');
    setModules([]); setStaffId(''); setIsActive(true); setPwdMode('auto'); setPassword('');
    setConfirm(''); setEmailError(''); setPwdError(''); setResult(null);
  };

  const toggleModule = (m: string) =>
    setModules((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(''); setPwdError('');
    const trimmedEmail = email.trim().toLowerCase();

    const parsed = consultantCreateSchema.safeParse({ fullName, email, type, pwdMode, password, confirm });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const path = first.path[0];
      if (path === 'email') setEmailError(first.message);
      else if (path === 'password' || path === 'confirm') setPwdError(first.message);
      else toast.error(first.message);
      return;
    }

    setLoading(true);
    try {
      const res = await provisionUser({
        email: trimmedEmail,
        fullName: fullName.trim(),
        role: 'Consultant',
        performedBy: performedBy || 'Manager',
        initialPassword: pwdMode === 'manual' ? password : undefined,
        consultantType: type,
        sapModules: modules,
        phoneNumber: phone.trim() || undefined,
        employeeId: staffId.trim() || undefined,
        specialization: specialization.trim() || undefined,
        loginEnabled: isActive,
      });
      if (!res.success) throw new Error(res.error || 'Provisioning failed');
      toast.success('Consultant provisioned successfully!');
      setResult({ email: trimmedEmail, password: res.password || password });
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  const close = () => { reset(); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
        {result ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Consultant Created</DialogTitle>
              <DialogDescription>Share these credentials securely. The temporary password is shown once.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Email</span><span className="font-medium">{result.email}</span></div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Temp password</span>
                <span className="flex items-center gap-2 font-mono">{result.password}
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(result.password); toast.success('Copied'); }} className="text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => reset()}>Create another</Button>
              <Button onClick={close}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-blue-600" /> Create Consultant</DialogTitle>
              <DialogDescription>Provision a new SAP consultant. They sign in with a temporary password and must reset it.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Full Name *</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Karthik Subramanian" required />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required />
                {emailError && <p className="text-xs text-red-600">{emailError}</p>}
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-1">
                <Label>Staff / Employee ID</Label>
                <Input value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-1">
                <Label>Consultant Type *</Label>
                <Select value={type} onValueChange={(v) => setType(v as 'Functional' | 'Technical')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Functional">Functional</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Specialization</Label>
                <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="Optional" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>SAP Modules</Label>
                <div className="flex flex-wrap gap-1.5">
                  {SAP_MODULES.map((m) => (
                    <button key={m} type="button" onClick={() => toggleModule(m)}
                      className={`rounded-md border px-2 py-1 text-xs transition-colors ${modules.includes(m) ? 'border-blue-600 bg-blue-600 text-white' : 'bg-background hover:bg-muted'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div><Label className="text-sm">Login enabled</Label><p className="text-xs text-muted-foreground">Allow this consultant to sign in.</p></div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={pwdMode === 'auto' ? 'default' : 'outline'} onClick={() => setPwdMode('auto')}>Auto-generate</Button>
                <Button type="button" size="sm" variant={pwdMode === 'manual' ? 'default' : 'outline'} onClick={() => setPwdMode('manual')}>Set manually</Button>
              </div>
              {pwdMode === 'manual' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temp password" />
                  <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm" />
                </div>
              )}
              {pwdError && <p className="text-xs text-red-600">{pwdError}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading || !fullName.trim() || !isEmailValid(email)}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Provisioning…</> : 'Provision Consultant'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
