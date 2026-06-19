'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Copy, CheckCircle2, Building2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { provisionUser } from '../../app/actions/auth';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';

/**
 * Shared Create Client dialog used by BOTH the SuperAdmin and Manager Users
 * areas. Includes the contract details section. Persistence (the dual-column
 * customer_contracts write — start_date + contract_start_date, end_date +
 * contract_end_date, total_hours + total_contract_hours, monthly_budget_hours +
 * monthly_allocated_hours — and the exactly-one-Active-contract-per-org rule)
 * is handled by the shared provisionUser server action. No forked logic.
 */

const CONTRACT_TYPES = ['AMS', 'Implementation Support', 'Rollout Support', 'Migration Support', 'Upgrade Support', 'Hypercare Support'];

const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isPasswordValid = (p: string) =>
  p.length >= 12 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?]/.test(p);

interface OrgRow { id: string; name: string; customer_short_code?: string | null }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  performedBy?: string;
  onCreated?: () => void;
}

export function CreateClientDialog({ open, onOpenChange, performedBy, onCreated }: Props) {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  // Contact
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  // Org
  const [orgMode, setOrgMode] = useState<'existing' | 'new'>('new');
  const [orgId, setOrgId] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCode, setNewOrgCode] = useState('');
  const [newOrgDomain, setNewOrgDomain] = useState('');
  // Contract
  const [contractType, setContractType] = useState('AMS');
  const [contractStatus, setContractStatus] = useState<'Active' | 'Draft' | 'Expired'>('Active');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthlyHours, setMonthlyHours] = useState('');
  const [annualHours, setAnnualHours] = useState('');
  // Per-client SLA targets (business hours per priority) — defaults 8/16/32/64.
  const [slaCritical, setSlaCritical] = useState('8');
  const [slaHigh, setSlaHigh] = useState('16');
  const [slaMedium, setSlaMedium] = useState('32');
  const [slaLow, setSlaLow] = useState('64');
  // Auth
  const [isActive, setIsActive] = useState(true);
  const [pwdMode, setPwdMode] = useState<'auto' | 'manual'>('auto');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [emailError, setEmailError] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    if (!open || !isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('organizations').select('id, name, customer_short_code').order('name');
      if (!cancelled && data) setOrgs(data as OrgRow[]);
    })();
    return () => { cancelled = true; };
  }, [open]);

  const reset = () => {
    setName(''); setEmail(''); setPhone(''); setDesignation('');
    setOrgMode('new'); setOrgId(''); setNewOrgName(''); setNewOrgCode(''); setNewOrgDomain('');
    setContractType('AMS'); setContractStatus('Active'); setStartDate(''); setEndDate('');
    setMonthlyHours(''); setAnnualHours('');
    setSlaCritical('8'); setSlaHigh('16'); setSlaMedium('32'); setSlaLow('64');
    setIsActive(true); setPwdMode('auto');
    setPassword(''); setConfirm(''); setEmailError(''); setPwdError(''); setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(''); setPwdError('');
    const trimmedEmail = email.trim().toLowerCase();
    if (name.trim().length < 2) { toast.error('Full Name must be at least 2 characters.'); return; }
    if (!isEmailValid(trimmedEmail)) { setEmailError('Please enter a valid email address.'); return; }
    if (pwdMode === 'manual') {
      if (!isPasswordValid(password)) { setPwdError('Password must be 12+ chars with upper, lower, number, and symbol.'); return; }
      if (password !== confirm) { setPwdError('Passwords do not match.'); return; }
    }
    if (!startDate || !endDate) { toast.error('Contract start and end dates are required.'); return; }
    if (new Date(endDate) <= new Date(startDate)) { toast.error('Contract End Date must be strictly after Start Date.'); return; }
    if (orgMode === 'new') {
      if (!newOrgName.trim()) { toast.error('Organization name is required.'); return; }
      if (!newOrgCode.trim()) { toast.error('Organization short code is required.'); return; }
      if (orgs.some((o) => (o.customer_short_code || '').toUpperCase() === newOrgCode.trim().toUpperCase())) {
        toast.error('An organization with this short code already exists.'); return;
      }
    } else if (!orgId) {
      toast.error('Please select an organization.'); return;
    }

    setLoading(true);
    try {
      const companyName = orgMode === 'existing' ? orgs.find((o) => o.id === orgId)?.name : newOrgName.trim();
      const res = await provisionUser({
        email: trimmedEmail,
        fullName: name.trim(),
        role: 'Customer',
        performedBy: performedBy || 'Manager',
        initialPassword: pwdMode === 'manual' ? password : undefined,
        loginEnabled: isActive,
        companyName,
        customerShortCode: orgMode === 'new' ? newOrgCode.trim().toUpperCase() : undefined,
        website: orgMode === 'new' ? newOrgDomain.trim() || undefined : undefined,
        contractType,
        contractStartDate: startDate,
        contractEndDate: endDate,
        monthlyAllocatedHours: monthlyHours ? Number(monthlyHours) : undefined,
        contractHours: annualHours ? Number(annualHours) : undefined,
        slaCriticalHours: slaCritical ? Number(slaCritical) : 8,
        slaHighHours: slaHigh ? Number(slaHigh) : 16,
        slaMediumHours: slaMedium ? Number(slaMedium) : 32,
        slaLowHours: slaLow ? Number(slaLow) : 64,
        contractStatus,
        designation: designation.trim() || undefined,
        phoneNumber: phone.trim() || undefined,
      });
      if (!res.success) throw new Error(res.error || 'Failed to create client.');
      toast.success('Client and contract created successfully!');
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
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        {result ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Client Created</DialogTitle>
              <DialogDescription>The client, organization, and contract were provisioned. Share these credentials securely.</DialogDescription>
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
              <DialogTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5 text-blue-600" /> Create Client</DialogTitle>
              <DialogDescription>Provision a customer contact, their organization, and an active support contract.</DialogDescription>
            </DialogHeader>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Contact Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-1"><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />{emailError && <p className="text-xs text-red-600">{emailError}</p>}</div>
              <div className="space-y-1"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" /></div>
              <div className="space-y-1"><Label>Designation</Label><Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Primary Contact" /></div>
            </div>

            {/* Organization */}
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Organization</Label>
                <div className="ml-auto flex gap-2">
                  <Button type="button" size="sm" variant={orgMode === 'new' ? 'default' : 'outline'} onClick={() => setOrgMode('new')}>New</Button>
                  <Button type="button" size="sm" variant={orgMode === 'existing' ? 'default' : 'outline'} onClick={() => setOrgMode('existing')}>Existing</Button>
                </div>
              </div>
              {orgMode === 'existing' ? (
                <Select value={orgId} onValueChange={setOrgId}>
                  <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Name *</Label><Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Short Code *</Label><Input value={newOrgCode} onChange={(e) => setNewOrgCode(e.target.value.toUpperCase())} placeholder="e.g. BAS" /></div>
                  <div className="space-y-1"><Label className="text-xs">Domain</Label><Input value={newOrgDomain} onChange={(e) => setNewOrgDomain(e.target.value)} placeholder="Optional" /></div>
                </div>
              )}
            </div>

            {/* Contract details */}
            <div className="space-y-3 rounded-md border p-3">
              <Label className="text-sm font-semibold">Contract Details</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Contract Type</Label>
                  <Select value={contractType} onValueChange={setContractType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONTRACT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={contractStatus} onValueChange={(v) => setContractStatus(v as 'Active' | 'Draft' | 'Expired')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Start Date *</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">End Date *</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Monthly Allocated Hours</Label><Input type="number" min="0" value={monthlyHours} onChange={(e) => setMonthlyHours(e.target.value)} placeholder="e.g. 100" /></div>
                <div className="space-y-1"><Label className="text-xs">Annual Contract Hours</Label><Input type="number" min="0" value={annualHours} onChange={(e) => setAnnualHours(e.target.value)} placeholder="e.g. 1200" /></div>
              </div>
            </div>

            {/* SLA Targets (business hours per priority, IST 10:30–19:30 Sun–Thu) */}
            <div className="space-y-3 rounded-md border p-3">
              <div>
                <Label className="text-sm font-semibold">SLA Targets</Label>
                <p className="text-xs text-muted-foreground">Resolution budget in business hours per priority. The SLA clock runs 10:30–19:30 IST, Sun–Thu.</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1"><Label className="text-xs">Critical (h)</Label><Input type="number" min="0" step="0.5" value={slaCritical} onChange={(e) => setSlaCritical(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">High (h)</Label><Input type="number" min="0" step="0.5" value={slaHigh} onChange={(e) => setSlaHigh(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Medium (h)</Label><Input type="number" min="0" step="0.5" value={slaMedium} onChange={(e) => setSlaMedium(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Low (h)</Label><Input type="number" min="0" step="0.5" value={slaLow} onChange={(e) => setSlaLow(e.target.value)} /></div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div><Label className="text-sm">Login enabled</Label><p className="text-xs text-muted-foreground">Allow this contact to sign in.</p></div>
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
              <Button type="submit" disabled={loading || !name.trim() || !isEmailValid(email)}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Provisioning…</> : 'Provision Client'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
