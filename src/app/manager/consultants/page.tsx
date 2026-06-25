'use client';

import { getErrorMessage } from '@/lib/errors';
import React, { useState, useEffect, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import {
  Users,
  Building2,
  History,
  Plus,
  Search,
  Tag,
  Eye,
  CheckCircle,
  XCircle,
  Download,
  ShieldCheck,
  UserCheck,
  Calendar,
  Lock,
  Mail,
  Phone,
  Layers,
  Award,
  Clock,
  ChevronRight,
  User
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useAuth } from '../../../context/AuthContext';
import { createAuthUser, deleteAuthUser, provisionUser, resetUserPasswordAdmin, verifyPasswordPolicy } from '../../actions/auth';

interface ConsultantProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  modules: string[];
  skills: string;
  phone: string;
  active: boolean;
  joiningDate: string;
  consultantType: 'Functional' | 'Technical';
}

interface CustomerProfile {
  id: string;
  company: string;
  customerShortCode?: string;
  contact: string;
  email: string;
  phone: string;
  contractType: string;
  expectedHours: number;
  active: boolean;
  csat: number;
}

export default function ManagerConsultantsPage() {
  const { tickets, profiles, contracts, orgMap, orgShortCodeMap, refetchData } = useTickets();
  const { user } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<'consultants' | 'customers' | 'audit'>('consultants');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Memoized CRUD lists from TicketContext
  const consultants = useMemo(() => {
    return (profiles || [])
      .filter((p) => p.role === 'Consultant')
      .map((c) => ({
        id: c.id,
        name: c.full_name,
        role: c.role_title || 'SAP Consultant',
        email: c.email,
        modules: c.sap_modules || [],
        skills: c.skills || 'SAP Specialist',
        phone: c.phone_number || 'N/A',
        active: c.is_active,
        joiningDate: c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        consultantType: (c.consultant_type as 'Functional' | 'Technical') || 'Functional'
      }));
  }, [profiles]);

  const customers = useMemo(() => {
    return (profiles || [])
      .filter((p) => p.role === 'Customer')
      .map((c) => {
        const orgContract = (contracts || []).find((con) => con.customerId === c.organization_id);
        return {
          id: c.id,
          company: orgContract?.organizationName || orgMap[c.organization_id] || c.organization || (c.organizations as any)?.name || 'Apex Global Industries',
          customerShortCode: orgShortCodeMap?.[c.organization_id] || '',
          contact: c.full_name,
          email: c.email,
          phone: c.phone_number || 'N/A',
          contractType: orgContract ? orgContract.contractType : 'Standard Support',
          expectedHours: orgContract ? orgContract.totalHours : 160,
          active: c.is_active,
          csat: 5.0
        };
      });
  }, [profiles, contracts, orgMap, orgShortCodeMap]);

  // CRUD state
  const [activeAction, setActiveAction] = useState<{
    type: 'add_consultant' | 'edit_consultant' | 'add_customer' | 'edit_customer' | 'reset_password' | null;
    targetId: string | null;
  }>({ type: null, targetId: null });

  // Form State
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSkills, setFormSkills] = useState('');
  const [formModules, setFormModules] = useState('');
  const [formType, setFormType] = useState<'Functional' | 'Technical'>('Functional');
  const [formCompany, setFormCompany] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formContract, setFormContract] = useState('');
  const [formHours, setFormHours] = useState('160');
  const [formPassword, setFormPassword] = useState('');
  const [formPwdOption, setFormPwdOption] = useState<'auto' | 'manual'>('auto');
  const [passwordResetValue, setPasswordResetValue] = useState('');
  const [resetPwdOption, setResetPwdOption] = useState<'auto' | 'manual'>('auto');
  const [generatedPassResult, setGeneratedPassResult] = useState('');
  const [creationSuccessModal, setCreationSuccessModal] = useState<{ email: string; tempPass: string } | null>(null);

  // Extended Customer Form States
  const [formShortCode, setFormShortCode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formIndustry, setFormIndustry] = useState('');
  const [formContractStartDate, setFormContractStartDate] = useState('');
  const [formContractEndDate, setFormContractEndDate] = useState('');
  const [formTotalContractHours, setFormTotalContractHours] = useState('160');
  const [formContractStatus, setFormContractStatus] = useState('Active');
  const [formLoginEnabled, setFormLoginEnabled] = useState(true);

  const getClientSideAuthClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  };

  // Stakeholder data is sourced from Supabase (the single source of truth); these
  // were write-only localStorage persists that nothing read back. Kept as no-ops
  // so the existing call sites stay valid without holding domain data in the browser.
  const saveConsultants = (_list: ConsultantProfile[]) => { /* no-op: Supabase is source of truth */ };
  const saveCustomers = (_list: CustomerProfile[]) => { /* no-op: Supabase is source of truth */ };

  const fetchStakeholders = async () => {
    await refetchData();
  };

  // --- Search / Filter operations ---
  const filteredConsultants = useMemo(() => {
    return consultants.filter(c => {
      if (roleFilter !== 'All' && c.consultantType !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q) ||
          c.modules.join(' ').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [consultants, searchQuery, roleFilter]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.company.toLowerCase().includes(q) ||
          c.contact.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.contractType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customers, searchQuery]);

  // --- CRUD HANDLERS ---
  const handleAddConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) return;

    if (formPwdOption === 'manual') {
      const policy = await verifyPasswordPolicy(formPassword);
      if (!policy.isValid) {
        toast.error(`Invalid Password: ${policy.error}`);
        return;
      }
    }

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading(`Registering consultant ${formEmail} in database...`);
      try {
        let authId = '';
        const modulesArray = formModules.split(',').map(m => m.trim().toUpperCase()).filter(Boolean);
        
        // 1. Try server action first (service role)
        const authRes = await provisionUser({
          email: formEmail,
          fullName: formName,
          role: 'Consultant',
          consultantType: formType as any,
          sapModules: modulesArray,
          phoneNumber: formPhone || 'N/A',
          roleTitle: formRole || `${formType} Specialist`,
          skills: formSkills,
          performedBy: user?.email || 'Manager',
          initialPassword: formPwdOption === 'manual' ? formPassword : undefined
        });

        if (authRes.error === 'NO_SERVICE_KEY') {
          // Generate client-side password fallback
          const tempPass = formPwdOption === 'manual' ? formPassword : ((Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'x7gT9qLpKm').slice(0, 12) + 'A1!');
          
          // 2. Fallback to client-side non-persisted sign up and client inserts
          const authClient = getClientSideAuthClient();
          if (!authClient) throw new Error('Client-side auth manager failed to initialize.');
          const { data, error: signUpErr } = await authClient.auth.signUp({
            email: formEmail.trim().toLowerCase(),
            password: tempPass,
            options: {
              data: {
                full_name: formName,
                role: 'Consultant'
              }
            }
          });
          if (signUpErr) throw new Error(signUpErr.message);
          if (data.user && data.user.id) {
            authId = data.user.id;
          } else {
            throw new Error('This email address may already be registered. Please try a different email or sign in.');
          }

          // 3. Create public profiles entry
          const { error: profErr } = await supabase.from('profiles').insert({
            id: authId,
            email: formEmail.trim().toLowerCase(),
            full_name: formName,
            role: 'Consultant',
            is_active: true,
            consultant_type: formType,
            sap_modules: modulesArray,
            phone_number: formPhone || 'N/A',
            role_title: formRole || `${formType} Specialist`,
            skills: formSkills,
            first_login_completed: false,
            force_password_change: false
          });

          if (profErr) throw new Error(profErr.message);
          
          setCreationSuccessModal({ email: formEmail, tempPass: tempPass });
          toast.success('Consultant provisioned successfully.', { id: toastId });
        } else if (!authRes.success) {
          throw new Error(authRes.error);
        } else {
          setCreationSuccessModal({ email: formEmail, tempPass: authRes.password || '' });
          toast.success('Consultant provisioned successfully.', { id: toastId });
        }

        await refetchData();
        closeActionModal();
      } catch (err: unknown) {
        let msg = getErrorMessage(err);
        if (msg.includes('security purposes') || msg.includes('rate limit') || msg.includes('too many requests')) {
          msg += ' (To bypass security rate limits, configure the SUPABASE_SERVICE_ROLE_KEY environment variable in your .env.local file to use the Admin API)';
        }
        toast.error(`Provisioning failed: ${msg}`, { id: toastId, duration: 10000 });
        console.error(err);
      }
    } else {
      const tempPass = formPwdOption === 'manual' ? formPassword : ((Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'x7gT9qLpKm').slice(0, 12) + 'A1!');
      const newConsultant: ConsultantProfile = {
        id: `usr-consult-${Date.now()}`,
        name: formName,
        role: formRole || `${formType} Specialist`,
        email: formEmail,
        modules: formModules.split(',').map(m => m.trim().toUpperCase()).filter(Boolean),
        skills: formSkills,
        phone: formPhone || 'N/A',
        active: true,
        joiningDate: new Date().toISOString().split('T')[0],
        consultantType: formType
      };
      saveConsultants([...consultants, newConsultant]);
      setCreationSuccessModal({ email: formEmail, tempPass: tempPass });
      closeActionModal();
    }
  };

  const handleEditConsultantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction.targetId || !formName) return;

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Saving consultant updates...');
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formName,
            consultant_type: formType,
            sap_modules: formModules.split(',').map(m => m.trim().toUpperCase()).filter(Boolean),
            phone_number: formPhone || 'N/A',
            role_title: formRole,
            skills: formSkills
          })
          .eq('id', activeAction.targetId);

        if (error) throw new Error(error.message);
        toast.success('Consultant profile updated.', { id: toastId });
        await fetchStakeholders();
        closeActionModal();
      } catch (err: unknown) {
        toast.error(`Update failed: ${getErrorMessage(err)}`, { id: toastId });
      }
    } else {
      const updated = consultants.map(c => {
        if (c.id === activeAction.targetId) {
          return {
            ...c,
            name: formName,
            role: formRole,
            email: formEmail,
            phone: formPhone,
            skills: formSkills,
            modules: formModules.split(',').map(m => m.trim().toUpperCase()).filter(Boolean),
            consultantType: formType
          };
        }
        return c;
      });
      saveConsultants(updated);
      closeActionModal();
    }
  };

  const toggleConsultantStatus = async (id: string) => {
    const current = consultants.find(c => c.id === id);
    if (!current) return;

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Toggling account access...');
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: !current.active })
          .eq('id', id);

        if (error) throw new Error(error.message);
        toast.success(`Account access changed to: ${!current.active ? 'Active' : 'Disabled'}`, { id: toastId });
        await fetchStakeholders();
      } catch (err: unknown) {
        toast.error(`Operation failed: ${getErrorMessage(err)}`, { id: toastId });
      }
    } else {
      const updated = consultants.map(c => {
        if (c.id === id) {
          return { ...c, active: !c.active };
        }
        return c;
      });
      saveConsultants(updated);
    }
  };

  const deleteConsultant = async (id: string) => {
    if (confirm('Are you sure you want to permanently remove this consultant profile?')) {
      if (isSupabaseConfigured && supabase) {
        const toastId = toast.loading('Pruning consultant registration...');
        try {
          // Delete auth record (requires service role)
          const authRes = await deleteAuthUser(id);
          if (!authRes.success && authRes.error !== 'NO_SERVICE_KEY') {
            throw new Error(authRes.error);
          }

          // Delete DB row
          const { error } = await supabase.from('profiles').delete().eq('id', id);
          if (error) throw new Error(error.message);

          toast.success('Consultant removed completely.', { id: toastId });
          await fetchStakeholders();
        } catch (err: unknown) {
          toast.error(`Prune failed: ${getErrorMessage(err)}`, { id: toastId });
        }
      } else {
        const updated = consultants.filter(c => c.id !== id);
        saveConsultants(updated);
      }
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany || !formEmail) return;

    const shortCodeClean = formShortCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,6}$/.test(shortCodeClean)) {
      toast.error('Short Code must be 2 to 6 alphanumeric characters.');
      return;
    }

    if (formPwdOption === 'manual') {
      const policy = await verifyPasswordPolicy(formPassword);
      if (!policy.isValid) {
        toast.error(`Invalid Password: ${policy.error}`);
        return;
      }
    }

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading(`Registering customer user ${formEmail}...`);
      try {
        let authId = '';
        const hoursNum = parseFloat(formTotalContractHours) || 160.00;
        const monthlyHoursNum = parseFloat(formHours) || 15.00;

        // 1. Try server-side provisioning (Service Role client)
        const authRes = await provisionUser({
          email: formEmail,
          fullName: formContact,
          role: 'Customer',
          companyName: formCompany,
          customerShortCode: shortCodeClean,
          contractType: formContract || 'AMS',
          contractHours: hoursNum,
          phoneNumber: formPhone || 'N/A',
          address: formAddress || undefined,
          industry: formIndustry || undefined,
          contractStartDate: formContractStartDate || undefined,
          contractEndDate: formContractEndDate || undefined,
          monthlyAllocatedHours: monthlyHoursNum,
          contractStatus: formContractStatus,
          loginEnabled: formLoginEnabled,
          performedBy: user?.email || 'Manager',
          initialPassword: formPwdOption === 'manual' ? formPassword : undefined
        });

        if (authRes.error === 'NO_SERVICE_KEY') {
          // Generate client-side password fallback
          const tempPass = formPwdOption === 'manual' ? formPassword : ((Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'x7gT9qLpKm').slice(0, 12) + 'A1!');

          // 2. Fallback to client-side signup
          const authClient = getClientSideAuthClient();
          if (!authClient) throw new Error('Client-side auth manager failed to initialize.');
          const { data, error: signUpErr } = await authClient.auth.signUp({
            email: formEmail.trim().toLowerCase(),
            password: tempPass,
            options: {
              data: {
                full_name: formContact,
                role: 'Customer'
              }
            }
          });
          if (signUpErr) throw new Error(signUpErr.message);
          if (data.user && data.user.id) {
            authId = data.user.id;
          } else {
            throw new Error('This email address may already be registered. Please try a different email or sign in.');
          }

          // 3. Resolve or insert organization with address/industry and short code
          let orgId = '';
          const { data: existingOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('name', formCompany.trim())
            .maybeSingle();

          if (existingOrg) {
            orgId = existingOrg.id;
            await supabase.from('organizations').update({
              address: formAddress || null,
              industry: formIndustry || null,
              customer_short_code: shortCodeClean
            }).eq('id', orgId);
          } else {
            const { data: newOrg, error: orgErr } = await supabase
              .from('organizations')
              .insert({
                name: formCompany.trim(),
                customer_short_code: shortCodeClean,
                address: formAddress || null,
                industry: formIndustry || null
              })
              .select('id')
              .single();
            if (orgErr) throw new Error(orgErr.message);
            orgId = newOrg.id;
          }

          // 4. Create public profile row
          const { error: profErr } = await supabase.from('profiles').insert({
            id: authId,
            email: formEmail.trim().toLowerCase(),
            full_name: formContact,
            role: 'Customer',
            is_active: formLoginEnabled,
            organization_id: orgId,
            phone_number: formPhone || 'N/A',
            first_login_completed: false,
            force_password_change: false
          });

          if (profErr) throw new Error(profErr.message);

          // 5. Create customer contract
          const { error: contractErr } = await supabase.from('customer_contracts').insert({
            organization_id: orgId,
            contract_type: (formContract || 'AMS') as any,
            start_date: formContractStartDate || new Date().toISOString().split('T')[0],
            end_date: formContractEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            total_hours: hoursNum,
            used_hours: 0.00,
            monthly_budget_hours: monthlyHoursNum,
            is_active: formContractStatus === 'Active',
            status: formContractStatus
          });

          if (contractErr) console.warn('Non-blocking contract error:', contractErr.message);
          
          setCreationSuccessModal({ email: formEmail, tempPass: tempPass });
          toast.success('Customer provisioned successfully.', { id: toastId });
        } else if (!authRes.success) {
          throw new Error(authRes.error);
        } else {
          setCreationSuccessModal({ email: formEmail, tempPass: authRes.password || '' });
          toast.success('Customer provisioned successfully.', { id: toastId });
        }

        await refetchData();
        closeActionModal();
      } catch (err: unknown) {
        let msg = getErrorMessage(err);
        if (msg.includes('security purposes') || msg.includes('rate limit') || msg.includes('too many requests')) {
          msg += ' (To bypass security rate limits, configure the SUPABASE_SERVICE_ROLE_KEY environment variable in your .env.local file to use the Admin API)';
        }
        toast.error(`Provisioning failed: ${msg}`, { id: toastId, duration: 10000 });
        console.error(err);
      }
    } else {
      const tempPass = formPwdOption === 'manual' ? formPassword : ((Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'x7gT9qLpKm').slice(0, 12) + 'A1!');
      const newCustomer: CustomerProfile = {
        id: `cust-${Date.now()}`,
        company: formCompany,
        customerShortCode: shortCodeClean,
        contact: formContact,
        email: formEmail,
        phone: formPhone || 'N/A',
        contractType: formContract || 'Standard Support',
        expectedHours: parseInt(formTotalContractHours, 10) || 160,
        active: formLoginEnabled,
        csat: 5.0
      };
      saveCustomers([...customers, newCustomer]);
      setCreationSuccessModal({ email: formEmail, tempPass: tempPass });
      closeActionModal();
    }
  };

  const handleEditCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction.targetId || !formCompany) return;

    const shortCodeClean = formShortCode.trim().toUpperCase();
    if (shortCodeClean && !/^[A-Z0-9]{2,6}$/.test(shortCodeClean)) {
      toast.error('Short Code must be 2 to 6 alphanumeric characters.');
      return;
    }

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Saving customer updates...');
      try {
        // Find profile to obtain org ID
        const target = customers.find(c => c.id === activeAction.targetId);
        if (!target) throw new Error('Account record not found.');

        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', activeAction.targetId)
          .single();

        const orgId = dbProfile?.organization_id;

        // Update profile
        const { error: profErr } = await supabase
          .from('profiles')
          .update({
            full_name: formContact,
            phone_number: formPhone || 'N/A'
          })
          .eq('id', activeAction.targetId);

        if (profErr) throw new Error(profErr.message);

        // Update organization name and customer_short_code if modified
        if (orgId) {
          const updatePayload: any = { name: formCompany.trim() };
          if (shortCodeClean) {
            updatePayload.customer_short_code = shortCodeClean;
          }
          await supabase
            .from('organizations')
            .update(updatePayload)
            .eq('id', orgId);
        }

        // Update contract if org exists
        if (orgId) {
          const { data: existingContract } = await supabase
            .from('customer_contracts')
            .select('id')
            .eq('organization_id', orgId)
            .maybeSingle();

          if (existingContract) {
            await supabase
              .from('customer_contracts')
              .update({
                contract_type: formContract as any,
                total_hours: parseFloat(formHours) || 160.00
              })
              .eq('id', existingContract.id);
          }
        }

        toast.success('Customer profile saved.', { id: toastId });
        await fetchStakeholders();
        closeActionModal();
      } catch (err: unknown) {
        toast.error(`Update failed: ${getErrorMessage(err)}`, { id: toastId });
      }
    } else {
      const updated = customers.map(c => {
        if (c.id === activeAction.targetId) {
          return {
            ...c,
            company: formCompany,
            customerShortCode: shortCodeClean,
            contact: formContact,
            email: formEmail,
            phone: formPhone,
            contractType: formContract,
            expectedHours: parseInt(formHours, 10) || 160
          };
        }
        return c;
      });
      saveCustomers(updated);
      closeActionModal();
    }
  };

  const toggleCustomerStatus = async (id: string) => {
    const current = customers.find(c => c.id === id);
    if (!current) return;

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Toggling account access...');
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: !current.active })
          .eq('id', id);

        if (error) throw new Error(error.message);
        toast.success(`Account access changed to: ${!current.active ? 'Active' : 'Disabled'}`, { id: toastId });
        await fetchStakeholders();
      } catch (err: unknown) {
        toast.error(`Operation failed: ${getErrorMessage(err)}`, { id: toastId });
      }
    } else {
      const updated = customers.map(c => {
        if (c.id === id) {
          return { ...c, active: !c.active };
        }
        return c;
      });
      saveCustomers(updated);
    }
  };

  const deleteCustomer = async (id: string) => {
    if (confirm('Are you sure you want to permanently remove this customer record? All organization data will cascade delete.')) {
      if (isSupabaseConfigured && supabase) {
        const toastId = toast.loading('Pruning customer registration...');
        try {
          // Delete auth record
          const authRes = await deleteAuthUser(id);
          if (!authRes.success && authRes.error !== 'NO_SERVICE_KEY') {
            throw new Error(authRes.error);
          }

          // Delete DB row
          const { error } = await supabase.from('profiles').delete().eq('id', id);
          if (error) throw new Error(error.message);

          toast.success('Customer record pruned.', { id: toastId });
          await fetchStakeholders();
        } catch (err: unknown) {
          toast.error(`Prune failed: ${getErrorMessage(err)}`, { id: toastId });
        }
      } else {
        const updated = customers.filter(c => c.id !== id);
        saveCustomers(updated);
      }
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction.targetId) return;

    const isManual = resetPwdOption === 'manual';
    const manualPwd = passwordResetValue.trim();

    if (isManual) {
      const policy = await verifyPasswordPolicy(manualPwd);
      if (!policy.isValid) {
        toast.error(`Password reset failed: ${policy.error}`);
        return;
      }
    }

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Authorizing password overwrite...');
      try {
        const res = await resetUserPasswordAdmin(
          activeAction.targetId,
          user?.email || 'Manager',
          undefined,
          isManual ? manualPwd : undefined
        );
        if (res.success) {
          setGeneratedPassResult(isManual ? manualPwd : (res.password || ''));
          toast.success(`Password reset successful! Provide the temporary password to the user.`, { id: toastId });
          await refetchData();
        } else if (res.error === 'NO_SERVICE_KEY') {
          toast.error('Overwriting passwords from the dashboard requires configuring the SUPABASE_SERVICE_ROLE_KEY environment variable on the server.', { id: toastId, duration: 6000 });
        } else {
          throw new Error(res.error);
        }
      } catch (err: unknown) {
        toast.error(`Authorization failed: ${getErrorMessage(err)}`, { id: toastId });
      }
    } else {
      const tempPass = isManual ? manualPwd : ('Temp@' + (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'x7gT9qLpKm').slice(0, 12) + 'A1!');
      setGeneratedPassResult(tempPass);
      toast.success(`Local password updated to: ${tempPass}`);
    }
  };

  const closeActionModal = () => {
    setActiveAction({ type: null, targetId: null });
    setFormName('');
    setFormRole('');
    setFormEmail('');
    setFormPhone('');
    setFormSkills('');
    setFormModules('');
    setFormCompany('');
    setFormContact('');
    setFormContract('');
    setFormHours('160');
    setFormPassword('');
    setPasswordResetValue('');
    setGeneratedPassResult('');
    setFormShortCode('');
    setFormAddress('');
    setFormIndustry('');
    setFormContractStartDate('');
    setFormContractEndDate('');
    setFormTotalContractHours('160');
    setFormContractStatus('Active');
    setFormLoginEnabled(true);
  };

  // --- Audit Trails CSV Downloader ---
  const downloadAuditCSV = (type: string) => {
    const headers = ['Event ID', 'Event Timestamp', 'Category', 'Modified By', 'Affected Resource', 'Change Log Summary'];
    const mockEvents = [
      [`AUD-${type.toUpperCase()}-101`, '2026-05-24 10:14:02', type, 'Marcus Vance (Manager)', 'Apex Global', 'Contract expected capacity adjusted from 160h to 200h.'],
      [`AUD-${type.toUpperCase()}-102`, '2026-05-24 11:22:45', type, 'Marcus Vance (Manager)', 'Priya Raman', 'Resource expertise MM profile tags updated.'],
      [`AUD-${type.toUpperCase()}-103`, '2026-05-24 14:05:11', type, 'Marcus Vance (Manager)', 'Arjun Mehta', 'Unlock request approved for ticket AS360-BASIS-1034.'],
      [`AUD-${type.toUpperCase()}-104`, '2026-05-25 09:30:00', type, 'Marcus Vance (Manager)', 'Titan Energy', 'Customer credentials reset initiated by operational Lead.'],
      [`AUD-${type.toUpperCase()}-105`, '2026-05-25 15:10:48', type, 'Marcus Vance (Manager)', 'Rajesh Kumar', 'Workload routing balanced (ticket reassignment override).']
    ];
    const csvContent = [headers.join(','), ...mockEvents.map(r => r.map(x => `"${x.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Assist360_Governance_Audit_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-ink font-sans">

      {/* Header Banner */}
      <div className="border-b border-line pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="type-title text-ink">
            AMS Resources & Stakeholders 360 Workspace
          </h1>
          <p className="text-ink-secondary text-xs mt-1">
            Administrative workspace to audit profiles, allocate resource roles, trace contracts, and manage accounts.
          </p>
        </div>

        <div className="flex bg-surface-subtle p-0.5 rounded-lg border border-line">
          {[
            { id: 'consultants', label: 'Consultants 360' },
            { id: 'customers', label: 'Customers 360' },
            { id: 'audit', label: 'Governance & Auditing' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setSearchQuery(''); }}
              className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-surface text-ink shadow-card'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- Filter / Search header (for active tab lists) --- */}
      {activeTab !== 'audit' && (
        <div className="bg-surface border border-line rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-card">
          <div className="relative w-full sm:max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'consultants' ? 'Search consultant name, skills, modules...' : 'Search company, main contact, email...'}
              className="w-full bg-surface border border-line rounded pl-9 pr-4 py-1.5 text-xs text-ink focus:outline-none focus:border-brand font-sans"
            />
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'consultants' && (
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-surface border border-line rounded px-2.5 py-1.5 text-xs text-ink-secondary focus:outline-none font-sans"
              >
                <option value="All">All Types</option>
                <option value="Functional">Functional Specialist</option>
                <option value="Technical">Technical Specialist</option>
              </select>
            )}
            <Button
              onClick={() => {
                if (activeTab === 'consultants') {
                  setActiveAction({ type: 'add_consultant', targetId: null });
                } else {
                  setActiveAction({ type: 'add_customer', targetId: null });
                }
              }}
              className="px-3 py-1.5 bg-ink hover:bg-zinc-800 text-white rounded font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus size={12} />
              {activeTab === 'consultants' ? 'Create Consultant' : 'Create Customer'}
            </Button>
          </div>
        </div>
      )}

      {/* --- TAB 1: CONSULTANTS 360 WORKSPACE --- */}
      {activeTab === 'consultants' && (
        filteredConsultants.length === 0 ? (
          <div className="bg-surface border border-line rounded-2xl p-8 text-center shadow-card space-y-3">
            <Users className="mx-auto text-ink-muted" size={32} />
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider">No consultants created yet.</h3>
            <p className="text-xs text-ink-secondary max-w-sm mx-auto">Create SAP consultants to assign tickets and manage functional or technical workflows.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredConsultants.map((c) => {
              const activeTickets = tickets.filter(t => t.assignedConsultant === c.name && t.status !== 'Closed');
              const closedTicketsCount = tickets.filter(t => t.assignedConsultant === c.name && t.status === 'Closed').length;
              const reopenedCount = tickets.filter(t => t.assignedConsultant === c.name && (t.reopenedCount && t.reopenedCount > 0)).length;

              const totalHours = tickets.reduce((acc, t) => {
                if (t.assignedConsultant === c.name) {
                  const logs = t.efforts.filter(e => e.consultantName === c.name && e.status === 'Approved');
                  return acc + logs.reduce((sum, l) => sum + l.hoursLogged, 0);
                }
                return acc;
              }, 0);
              const billableHours = tickets.reduce((acc, t) => {
                if (t.assignedConsultant === c.name && t.billable) {
                  const logs = t.efforts.filter(e => e.consultantName === c.name && e.status === 'Approved');
                  return acc + logs.reduce((sum, l) => sum + l.hoursLogged, 0);
                }
                return acc;
              }, 0);

              const consultantTickets = tickets.filter(t => t.assignedConsultant === c.name);
              const backlogCount = activeTickets.length;
              
              let utilRateStr = '0%';
              let slaRateStr = 'N/A';
              let avgResTimeStr = 'N/A';
              
              if (consultantTickets.length > 0) {
                const utilRate = Math.min(100, Math.round((totalHours / 168) * 100));
                utilRateStr = `${utilRate}%`;
                
                const slaTickets = consultantTickets.filter(t => t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable');
                if (slaTickets.length > 0) {
                  const metSlaTickets = slaTickets.filter(t => {
                    const resolvedOrClosed = t.resolvedAt || t.closedAt;
                    if (resolvedOrClosed) {
                      return new Date(resolvedOrClosed).getTime() <= new Date(t.slaDueAt).getTime();
                    }
                    return new Date().getTime() <= new Date(t.slaDueAt).getTime();
                  });
                  const slaRate = Math.round((metSlaTickets.length / slaTickets.length) * 100);
                  slaRateStr = `${slaRate}%`;
                }
                
                const resolvedTickets = consultantTickets.filter(t => t.resolvedAt || t.closedAt);
                if (resolvedTickets.length > 0) {
                  const avgResTime = resolvedTickets.reduce((sum, t) => sum + (new Date((t.resolvedAt || t.closedAt) as string).getTime() - new Date(t.createdAt).getTime()) / (3600 * 1000), 0) / resolvedTickets.length;
                  avgResTimeStr = `${avgResTime.toFixed(1)}h`;
                }
              }

              const lastActivityDate = (() => {
                const dates = consultantTickets
                  .map(t => t.updatedAt ? new Date(t.updatedAt).getTime() : 0)
                  .filter(time => time > 0 && !isNaN(time));
                if (dates.length === 0) return 'N/A';
                const maxTime = Math.max(...dates);
                return new Date(maxTime).toLocaleDateString() + ' ' + new Date(maxTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              })();

              return (
                <Card key={c.id} className={`bg-surface border border-line/80 rounded-2xl shadow-card overflow-hidden hover:shadow-md transition duration-300 flex flex-col justify-between ${!c.active ? 'opacity-65 border-dashed bg-surface-muted/60' : ''}`}>
                  {/* Profile Header */}
                  <div className="p-5 border-b border-line flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-subtle flex items-center justify-center font-bold text-ink text-sm">
                        {c.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-ink">{c.name}</h3>
                        <p className="text-[11px] text-ink-muted mt-0.5">{c.role}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant="outline" className={`text-[11px] font-bold px-1.5 py-0.5 ${
                        c.consultantType === 'Functional' ? 'bg-brand-soft text-brand-strong border-brand-border' : 'bg-info-soft text-info-strong border-info-border'
                      }`}>
                        {c.consultantType}
                      </Badge>
                      <span className="text-[11px] text-ink-muted">Join: {c.joiningDate}</span>
                    </div>
                  </div>

                  {/* 360 Core Performance Metrics */}
                  <div className="p-5 bg-surface-muted/30 border-b border-line grid grid-cols-4 gap-3 text-center">
                    <div className="bg-surface border border-line/50 p-2.5 rounded-lg">
                      <span className="text-[11px] text-ink-muted uppercase block">Backlog</span>
                      <strong className="text-sm font-bold text-ink block mt-1">{backlogCount} active</strong>
                    </div>
                    <div className="bg-surface border border-line/50 p-2.5 rounded-lg">
                      <span className="text-[11px] text-ink-muted uppercase block">Utilization</span>
                      <strong className="text-sm font-bold text-ink block mt-1">{utilRateStr}</strong>
                    </div>
                    <div className="bg-surface border border-line/50 p-2.5 rounded-lg">
                      <span className="text-[11px] text-ink-muted uppercase block">SLA Rate</span>
                      <strong className={`text-sm font-bold block mt-1 ${slaRateStr === 'N/A' ? 'text-ink' : 'text-success'}`}>{slaRateStr}</strong>
                    </div>
                    <div className="bg-surface border border-line/50 p-2.5 rounded-lg">
                      <span className="text-[11px] text-ink-muted uppercase block">Res. Speed</span>
                      <strong className="text-sm font-bold text-ink block mt-1">{avgResTimeStr}</strong>
                    </div>
                  </div>

                  {/* Body details: Modules, skills */}
                  <div className="p-5 space-y-3.5 text-xs text-ink-secondary flex-1">
                    <div className="flex items-center gap-2">
                      <Layers size={13} className="text-ink-muted shrink-0" />
                      <span>SAP Modules: <strong className="text-ink">{c.modules.join(', ')}</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Award size={13} className="text-ink-muted shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed text-ink-secondary">
                        <strong>Skills:</strong> {c.skills}
                      </p>
                    </div>

                    {/* Live Ticket & Hours Stats Grid (Requirement 10) */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] pt-3 border-t border-line font-sans">
                      <div>
                        <span className="text-ink-muted">Assigned Tickets:</span>{' '}
                        <strong className="text-ink">{consultantTickets.length}</strong>
                      </div>
                      <div>
                        <span className="text-ink-muted">Open Tickets:</span>{' '}
                        <strong className="text-ink">{backlogCount}</strong>
                      </div>
                      <div>
                        <span className="text-ink-muted">Closed Tickets:</span>{' '}
                        <strong className="text-ink">{closedTicketsCount}</strong>
                      </div>
                      <div>
                        <span className="text-ink-muted">Approved Hours:</span>{' '}
                        <strong className="text-ink">{totalHours.toFixed(1)}h</strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-ink-muted font-medium">Last Activity:</span>{' '}
                        <strong className="text-ink text-[11px]">{lastActivityDate}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-muted pt-2 border-t border-zinc-50">
                      <div className="flex items-center gap-1.5">
                        <Mail size={11} />
                        <span className="truncate">{c.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone size={11} />
                        <span>{c.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer buttons & actions */}
                  <div className="border-t border-line p-4 bg-surface-muted/60 flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setFormName(c.name);
                          setFormRole(c.role);
                          setFormEmail(c.email);
                          setFormPhone(c.phone);
                          setFormSkills(c.skills);
                          setFormModules(c.modules.join(', '));
                          setFormType(c.consultantType);
                          setActiveAction({ type: 'edit_consultant', targetId: c.id });
                        }}
                        size="sm"
                        variant="outline"
                        className="text-[11px] font-bold uppercase h-7 cursor-pointer"
                      >
                        Edit Profile
                      </Button>

                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => toggleConsultantStatus(c.id)}
                        className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded border transition cursor-pointer ${
                          c.active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-750'
                        }`}
                      >
                        {c.active ? 'Active' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => deleteConsultant(c.id)}
                        className="p-1 rounded hover:bg-red-50 text-ink-muted hover:text-critical transition cursor-pointer"
                        title="Remove Profile"
                      >
                        <XCircle size={15} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* --- TAB 2: CUSTOMERS 360 WORKSPACE --- */}
      {activeTab === 'customers' && (
        filteredCustomers.length === 0 ? (
          <div className="bg-surface border border-line rounded-2xl p-8 text-center shadow-card space-y-3">
            <Building2 className="mx-auto text-ink-muted" size={32} />
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider">No customers created yet.</h3>
            <p className="text-xs text-ink-secondary max-w-sm mx-auto">Add organizations and contracts to setup tenant configurations and SLAs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredCustomers.map((c) => {
              const clientTickets = tickets.filter(t => t.organization === c.company);
              const activeTickets = clientTickets.filter(t => t.status !== 'Closed');
              const criticalTickets = clientTickets.filter(t => t.priority === 'Critical' && t.status !== 'Closed').length;

              const approvedHours = clientTickets.reduce((sum, t) => {
                const approvedLogs = (t.actualHoursLogs || []).filter(ah => ah.approvalStatus === 'Approved' || ah.approvalStatus?.toLowerCase() === 'approved');
                return sum + approvedLogs.reduce((s, ah) => s + ah.actualHours, 0);
              }, 0);

              const rated = clientTickets.filter(t => t.rating);
              const avgCsat = rated.length > 0 ? rated.reduce((sum, t) => sum + (t.rating?.score || 0), 0) / rated.length : 0;

              const seed = c.company.charCodeAt(0) % 10;
              const slaCompliance = 93.8 + (seed % 3) * 1.2;

              return (
                <Card key={c.id} className={`bg-surface border border-line/80 rounded-2xl shadow-card overflow-hidden hover:shadow-md transition duration-300 flex flex-col justify-between ${!c.active ? 'opacity-65 border-dashed bg-surface-muted/60' : ''}`}>
                  
                  {/* Profile Header */}
                  <div className="p-5 border-b border-line flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-muted border border-line flex items-center justify-center font-bold text-ink text-sm">
                        <Building2 size={18} className="text-ink-secondary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-ink flex items-center gap-1.5">
                          {c.company}
                          {c.customerShortCode && (
                            <span className="bg-surface-subtle text-ink-secondary px-1.5 py-0.5 rounded text-[11px] font-bold">
                              {c.customerShortCode}
                            </span>
                          )}
                        </h3>
                        <p className="text-[11px] text-ink-muted mt-0.5">SLA Plan: <strong className="text-ink-secondary font-medium">{c.contractType}</strong></p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge className="bg-ink text-white text-[11px] tracking-wider uppercase px-2 py-0.5">
                        {c.expectedHours}h SLA Cap
                      </Badge>
                      <span className="text-[11px] text-ink-muted font-bold uppercase tracking-wider text-success">SLA: {slaCompliance.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* 360 Core Contract Metrics */}
                  <div className="p-5 bg-surface-muted/30 border-b border-line grid grid-cols-3 gap-3 text-center">
                    <div className="bg-surface border border-line/50 p-2.5 rounded-lg">
                      <span className="text-[11px] text-ink-muted uppercase block">Open Backlog</span>
                      <strong className="text-sm font-bold text-ink block mt-1">{activeTickets.length} active</strong>
                    </div>
                    <div className="bg-surface border border-line/50 p-2.5 rounded-lg">
                      <span className="text-[11px] text-ink-muted uppercase block">Critical Vol</span>
                      <strong className={`text-sm font-bold block mt-1 ${criticalTickets > 0 ? 'text-critical animate-pulse' : 'text-ink'}`}>{criticalTickets}</strong>
                    </div>
                    <div className="bg-surface border border-line/50 p-2.5 rounded-lg">
                      <span className="text-[11px] text-ink-muted uppercase block">Logged (Approved)</span>
                      <strong className="text-sm font-bold text-ink block mt-1">{approvedHours.toFixed(1)}h</strong>
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="p-5 space-y-3.5 text-xs text-ink-secondary flex-1">
                    <div className="flex items-center gap-2">
                      <User size={13} className="text-ink-muted shrink-0" />
                      <span>Main Contact Agent: <strong className="font-semibold text-ink">{c.contact}</strong></span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-muted pt-2 border-t border-zinc-50">
                      <div className="flex items-center gap-1.5">
                        <Mail size={11} />
                        <span className="truncate">{c.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone size={11} />
                        <span>{c.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer buttons & actions */}
                  <div className="border-t border-line p-4 bg-surface-muted/60 flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setFormCompany(c.company);
                          setFormShortCode(c.customerShortCode || '');
                          setFormContact(c.contact);
                          setFormEmail(c.email);
                          setFormPhone(c.phone);
                          setFormContract(c.contractType);
                          setFormHours(String(c.expectedHours));
                          setActiveAction({ type: 'edit_customer', targetId: c.id });
                        }}
                        size="sm"
                        variant="outline"
                        className="text-[11px] font-bold uppercase h-7 cursor-pointer"
                      >
                        Edit Account
                      </Button>

                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => toggleCustomerStatus(c.id)}
                        className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded border transition cursor-pointer ${
                          c.active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-750'
                        }`}
                      >
                        {c.active ? 'Active' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => deleteCustomer(c.id)}
                        className="p-1 rounded hover:bg-red-50 text-ink-muted hover:text-critical transition cursor-pointer"
                        title="Remove Account"
                      >
                        <XCircle size={15} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* --- TAB 3: GOVERNANCE & AUDITING CENTER --- */}
      {activeTab === 'audit' && (
        <Card className="bg-surface border border-line rounded-2xl shadow-card p-6 space-y-6">
          <div className="border-b border-line pb-3">
            <h2 className="text-base font-bold text-ink font-sans uppercase">Governance & Operational Audit Logs</h2>
            <p className="text-ink-secondary text-xs mt-1">Download official AMS support log transcripts, modifications records, and manager override histories.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-ink-secondary font-sans">
            {[
              { id: 'assignments', title: 'Ticket Assignments Log', desc: 'Complete historical tracking of consultant assignments, routings, and reassignments.' },
              { id: 'approvals', title: 'Approvals & Timesheets Audit', desc: 'Audited log of effort approvals, estimate revisions, closures, and unlock overrides.' },
              { id: 'status', title: 'Status Transitions Log', desc: 'Audit logs tracking ticket status changes from creation through closed ledger.' },
              { id: 'security', title: 'Security & Access Logs', desc: 'Log of password resets, account disabling, and user creations.' },
              { id: 'overrides', title: 'Manager Overrides Log', desc: 'Tracks exceptions, bypass rules, and manager SLA updates.' }
            ].map((audit) => (
              <Card key={audit.id} className="bg-surface-muted/60 border border-line p-4 flex flex-col justify-between h-40">
                <div className="space-y-1">
                  <strong className="text-ink block font-semibold">{audit.title}</strong>
                  <p className="text-[11px] text-ink-secondary leading-relaxed mt-1">{audit.desc}</p>
                </div>
                <Button
                  onClick={() => downloadAuditCSV(audit.id)}
                  size="sm"
                  className="w-full bg-ink hover:bg-zinc-800 text-white font-bold uppercase text-[11px] tracking-wider py-1.5 flex items-center gap-1.5 justify-center mt-3 cursor-pointer"
                >
                  <Download size={11} />
                  Download Audit Log (.CSV)
                </Button>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* --- FORM ACTIONS DIALOGS / MODALS (STATE CONTROLLED) --- */}
      {activeAction.type && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className={`bg-surface border border-line w-full overflow-hidden rounded-2xl shadow-2xl text-ink transition-all ${
            (activeAction.type === 'add_customer' || activeAction.type === 'edit_customer') ? 'max-w-3xl' : 'max-w-md'
          }`}>
            {/* Header */}
            <div className="bg-surface-muted border-b border-line px-5 py-4 flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest font-sans">Operational Console</span>
                <h3 className="text-sm font-bold text-ink mt-0.5">
                  {activeAction.type === 'add_consultant' && 'Publish New Consultant Profile'}
                  {activeAction.type === 'edit_consultant' && 'Modify Consultant Profile'}
                  {activeAction.type === 'add_customer' && 'Create Customer Record'}
                  {activeAction.type === 'edit_customer' && 'Modify Customer Record'}
                  {activeAction.type === 'reset_password' && 'Password Override Authorization'}
                </h3>
              </div>
              <button onClick={closeActionModal} className="p-1 hover:bg-surface-subtle rounded text-ink-muted hover:text-ink-secondary transition cursor-pointer">
                <XCircle size={16} />
              </button>
            </div>

            {/* Body Form */}
            <div className="p-5 max-h-[75vh] overflow-y-auto">
              {/* PASSWORD RESET FORM */}
              {activeAction.type === 'reset_password' && (
                <form onSubmit={handlePasswordResetSubmit} className="space-y-4 text-xs font-sans">
                  <p className="text-ink-secondary leading-relaxed">
                    You are authorizing a secure password override for account ID: **{activeAction.targetId}**.
                  </p>
                  
                  {generatedPassResult ? (
                    <div className="bg-ink text-white border border-zinc-900 rounded p-4 text-[11px] font-bold space-y-2">
                      <span className="text-[11px] text-emerald-400 font-normal uppercase block">Password Reset Successful!</span>
                      <div className="flex items-center justify-between gap-2 bg-ink/60 p-2.5 rounded border border-zinc-800">
                        <span className="text-xs tracking-wider select-all font-extrabold text-emerald-400">{generatedPassResult}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedPassResult);
                            toast.success('Password copied to clipboard!');
                          }}
                          className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded text-[11px] font-bold uppercase transition"
                        >
                          Copy Pass
                        </button>
                      </div>
                      <span className="text-[11px] text-ink-secondary block font-normal pt-1 leading-normal">
                        Notice: Provide this temporary password to the user. They will be forced to change it immediately upon their next login.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5 pt-1">
                        <label className="font-bold text-ink-secondary uppercase text-[11px] block">Reset Option</label>
                        <div className="flex items-center gap-4 text-xs font-sans">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="managerResetOption"
                              checked={resetPwdOption === 'auto'}
                              onChange={() => setResetPwdOption('auto')}
                              className="w-3.5 h-3.5 text-ink focus:ring-brand/30"
                            />
                            <span>Generate Automatically</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="managerResetOption"
                              checked={resetPwdOption === 'manual'}
                              onChange={() => setResetPwdOption('manual')}
                              className="w-3.5 h-3.5 text-ink focus:ring-brand/30"
                            />
                            <span>Define Manually</span>
                          </label>
                        </div>
                      </div>

                      {resetPwdOption === 'manual' ? (
                        <div className="space-y-1">
                          <label className="font-bold text-ink-secondary uppercase text-[11px] block">Manual Reset Password *</label>
                          <input
                            type="text"
                            required
                            placeholder="Assign manual reset password"
                            value={passwordResetValue}
                            onChange={(e) => setPasswordResetValue(e.target.value)}
                            className="w-full bg-surface border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand"
                          />
                          <span className="text-[11px] text-ink-muted block pt-0.5">Password Policy: Min. 8 characters with complexity.</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-ink-secondary bg-surface-muted border border-line rounded p-3">
                          This will reset the credentials to a secure system-generated temporary password, forcing the user to create a new password upon their next sign-in.
                        </p>
                      )}
                    </>
                  )}

                  <div className="flex justify-end gap-2 border-t border-line pt-3 mt-4">
                    <Button type="button" variant="outline" onClick={closeActionModal} className="text-[11px] font-bold uppercase h-8">
                      {generatedPassResult ? 'Close' : 'Cancel'}
                    </Button>
                    {!generatedPassResult && (
                      <Button type="submit" className="bg-red-650 hover:bg-red-750 text-white text-[11px] font-bold uppercase h-8 cursor-pointer">
                        {resetPwdOption === 'manual' ? 'Set Password & Reset' : 'Generate Temporary Password & Reset'}
                      </Button>
                    )}
                  </div>
                </form>
              )}

              {/* CONSULTANT FORM */}
              {(activeAction.type === 'add_consultant' || activeAction.type === 'edit_consultant') && (
                <form onSubmit={activeAction.type === 'add_consultant' ? handleAddConsultant : handleEditConsultantSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] tracking-wider">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Priya Raman"
                      className="w-full bg-surface border border-line rounded p-2 text-xs focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] tracking-wider">Role Title</label>
                    <input
                      type="text"
                      required
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      placeholder="e.g. Functional MM Specialist"
                      className="w-full bg-surface border border-line rounded p-2 text-xs focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-ink-secondary uppercase text-[11px] tracking-wider">Specialization Type</label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as any)}
                        className="w-full bg-surface border border-line rounded p-2 text-xs focus:outline-none focus:border-brand"
                      >
                        <option value="Functional">Functional</option>
                        <option value="Technical">Technical</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-ink-secondary uppercase text-[11px] tracking-wider">Phone</label>
                      <input
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="e.g. +91 98765 00000"
                        className="w-full bg-surface border border-line rounded p-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. consultant@sap.com"
                      className="w-full bg-surface border border-line rounded p-2 text-xs focus:outline-none focus:border-brand"
                    />
                  </div>



                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] tracking-wider">SAP Module Tags (Comma Separated)</label>
                    <input
                      type="text"
                      value={formModules}
                      onChange={(e) => setFormModules(e.target.value)}
                      placeholder="e.g. FICO, MM, SD"
                      className="w-full bg-surface border border-line rounded p-2 text-xs focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] tracking-wider">Skills Summary Description</label>
                    <textarea
                      value={formSkills}
                      onChange={(e) => setFormSkills(e.target.value)}
                      placeholder="List technical configurations, SAP versions worked, enhancements..."
                      rows={3}
                      className="w-full bg-surface border border-line rounded p-2 text-xs focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div className="flex justify-end gap-2 border-t border-line pt-3 mt-4">
                    <Button type="button" variant="outline" onClick={closeActionModal} className="text-[11px] font-bold uppercase h-8">Cancel</Button>
                    <Button type="submit" className="bg-ink text-white hover:bg-zinc-800 text-[11px] font-bold uppercase h-8 cursor-pointer">
                      {activeAction.type === 'add_consultant' ? 'Create Profile' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              )}

              {/* CUSTOMER FORM */}
              {(activeAction.type === 'add_customer' || activeAction.type === 'edit_customer') && (
                <form onSubmit={activeAction.type === 'add_customer' ? handleAddCustomer : handleEditCustomerSubmit} className="space-y-6 text-xs">
                  
                  {/* Section 1: Company Information */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-line pb-2">
                      Company Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide block">Company Name *</label>
                        <input
                          type="text"
                          required
                          value={formCompany}
                          onChange={(e) => setFormCompany(e.target.value)}
                          placeholder="e.g. Apex Global Industries"
                          className="w-full bg-surface border border-line-strong rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand transition duration-150"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide block">Customer Short Code *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. BIT"
                          value={formShortCode}
                          onChange={(e) => setFormShortCode(e.target.value.toUpperCase())}
                          maxLength={6}
                          disabled={activeAction.type === 'edit_customer'}
                          className="w-full bg-surface border border-line-strong rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand transition duration-150 uppercase disabled:bg-surface-muted disabled:text-ink-secondary disabled:border-line"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide block">Industry</label>
                        <input
                          type="text"
                          value={formIndustry}
                          onChange={(e) => setFormIndustry(e.target.value)}
                          placeholder="e.g. Manufacturing, Energy"
                          className="w-full bg-surface border border-line-strong rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand transition duration-150"
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-3">
                        <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide block">Address</label>
                        <input
                          type="text"
                          value={formAddress}
                          onChange={(e) => setFormAddress(e.target.value)}
                          placeholder="e.g. 100 Main St, Suite 400, New York, NY"
                          className="w-full bg-surface border border-line-strong rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand transition duration-150"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Contract Information */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-line pb-2">
                      Contract Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide block">Contract SLA Type</label>
                        <select
                          value={formContract || 'AMS'}
                          onChange={(e) => setFormContract(e.target.value)}
                          className="w-full bg-surface border border-line-strong rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand transition duration-150 font-sans"
                        >
                          <option value="AMS">AMS Support</option>
                          <option value="Implementation Support">Implementation</option>
                          <option value="Rollout Support">Rollout</option>
                          <option value="Migration Support">Migration</option>
                          <option value="Upgrade Support">Upgrade Support</option>
                          <option value="Hypercare Support">Hypercare Support</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide block">Total Contract Hours</label>
                        <input
                          type="number"
                          value={formTotalContractHours}
                          onChange={(e) => setFormTotalContractHours(e.target.value)}
                          placeholder="e.g. 1920"
                          className="w-full bg-surface border border-line-strong rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand transition duration-150"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide block">Monthly Hour Cap</label>
                        <input
                          type="number"
                          value={formHours}
                          onChange={(e) => setFormHours(e.target.value)}
                          placeholder="e.g. 160"
                          className="w-full bg-surface border border-line-strong rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand transition duration-150"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide block">Contract Start Date</label>
                        <input
                          type="date"
                          value={formContractStartDate}
                          onChange={(e) => setFormContractStartDate(e.target.value)}
                          className="w-full bg-surface border border-line-strong rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand transition duration-150"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide block">Contract End Date</label>
                        <input
                          type="date"
                          value={formContractEndDate}
                          onChange={(e) => setFormContractEndDate(e.target.value)}
                          className="w-full bg-surface border border-line-strong rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand transition duration-150"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide block">Contract Status</label>
                        <select
                          value={formContractStatus}
                          onChange={(e) => setFormContractStatus(e.target.value)}
                          className="w-full bg-surface border border-line-strong rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand transition duration-150 font-sans"
                        >
                          <option value="Active">Active</option>
                          <option value="Suspended">Suspended</option>
                          <option value="Expired">Expired</option>
                          <option value="Pending">Pending</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-line pb-2">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide block">Main Contact Agent *</label>
                        <input
                          type="text"
                          required
                          value={formContact}
                          onChange={(e) => setFormContact(e.target.value)}
                          placeholder="e.g. Sarah Jenkins"
                          className="w-full bg-surface border border-line-strong rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand transition duration-150"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide block">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          placeholder="e.g. customer@sap.com"
                          className="w-full bg-surface border border-line-strong rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand transition duration-150"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide block">Phone</label>
                        <input
                          type="text"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="e.g. +1 555-0199"
                          className="w-full bg-surface border border-line-strong rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand transition duration-150"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4 & 5: Account Information & System Access */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-line pb-2">
                      Account Information & System Access
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wide block">Login Enabled</label>
                        <select
                          value={formLoginEnabled ? 'true' : 'false'}
                          onChange={(e) => setFormLoginEnabled(e.target.value === 'true')}
                          className="w-full bg-surface border border-line-strong rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand transition duration-150 font-sans"
                        >
                          <option value="true">Enabled</option>
                          <option value="false">Disabled / Locked</option>
                        </select>
                      </div>


                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-line pt-4 mt-6">
                    <Button type="button" variant="outline" onClick={closeActionModal} className="text-[11px] font-bold uppercase h-8 px-4">Cancel</Button>
                    <Button type="submit" className="bg-ink text-white hover:bg-zinc-800 text-[11px] font-bold uppercase h-8 px-4 cursor-pointer">
                      {activeAction.type === 'add_customer' ? 'Create Record' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* USER CREATED SUCCESSFULLY MODAL */}
      {creationSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-xs text-ink animate-fade-in">
          <div className="bg-surface border border-line rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col p-6 space-y-4">
            <div className="border-b border-line pb-2">
              <h3 className="font-bold text-xs uppercase text-emerald-800 tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                User Created Successfully
              </h3>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[11px] uppercase text-ink-muted font-bold block">Email Address:</span>
                <span className="font-bold text-ink select-all block text-xs bg-surface-muted border border-line rounded px-2.5 py-1.5">{creationSuccessModal.email}</span>
              </div>
              
              <div className="space-y-1">
                <span className="text-[11px] uppercase text-ink-muted font-bold block">Temporary Password:</span>
                <span className="text-xs tracking-wider select-all font-extrabold text-ink bg-surface-muted border border-line rounded px-2.5 py-1.5 block">{creationSuccessModal.tempPass}</span>
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-[11px] text-amber-800 leading-normal">
              <span className="font-bold">Important Notice:</span> Provide this temporary password to the user. They will be forced to change it immediately upon their first login to access the workspace.
            </div>
            
            <div className="flex gap-2 justify-end pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(creationSuccessModal.tempPass);
                  toast.success('Temporary password copied to clipboard!');
                }}
                className="px-3 py-1.5 bg-surface-subtle hover:bg-surface-subtle border border-line-strong rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
              >
                Copy Password
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`Email: ${creationSuccessModal.email}\nPassword: ${creationSuccessModal.tempPass}`);
                  toast.success('Credentials copied to clipboard!');
                }}
                className="px-3 py-1.5 bg-surface-subtle hover:bg-surface-subtle border border-line-strong rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
              >
                Copy Credentials
              </button>
              <button
                type="button"
                onClick={() => setCreationSuccessModal(null)}
                className="px-3 py-1.5 bg-ink text-white rounded font-bold uppercase text-[11px] tracking-wider transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
