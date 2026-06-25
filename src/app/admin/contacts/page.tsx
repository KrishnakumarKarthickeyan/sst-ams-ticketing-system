'use client';

import { getErrorMessage } from '@/lib/errors';
import React, { useState, useEffect } from 'react';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { 
  Building2, Plus, Users, Mail, Phone, ShieldCheck, UserCheck, Trash2, Edit, X, User
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from '../../../components/ui/dialog';
import { toast } from 'sonner';

interface ContactItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  designation: string;
  is_primary: boolean;
  is_secondary: boolean;
  tags: string[];
}

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [roleType, setRoleType] = useState<'normal' | 'primary' | 'secondary'>('normal');
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);

  const fetchContactsData = async () => {
    setLoading(true);
    if (isSupabaseConfigured && supabase) {
      try {
        // Fetch contacts
        const { data: contactsData, error: contactsErr } = await supabase
          .from('organization_contacts')
          .select('*')
          .order('name');

        if (contactsErr) throw contactsErr;

        // Fetch tags
        const { data: tagsData, error: tagsErr } = await supabase
          .from('organization_contact_tags')
          .select('*');

        if (tagsErr) throw tagsErr;

        // Fetch active organizations
        const { data: orgData, error: orgErr } = await supabase
          .from('organizations')
          .select('name')
          .order('name');

        if (orgErr) throw orgErr;

        setOrganizations((orgData || []).map(o => o.name));

        const mapped: ContactItem[] = (contactsData || []).map(c => {
          const associatedTags = (tagsData || [])
            .filter(t => t.contact_id === c.id)
            .map(t => t.organization_name);
          return {
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone || undefined,
            designation: c.designation,
            is_primary: c.is_primary,
            is_secondary: c.is_secondary,
            tags: associatedTags
          };
        });

        setContacts(mapped);
      } catch (err: unknown) {
        console.error('Error fetching contacts registry:', err);
        toast.error(`Database query failed: ${getErrorMessage(err)}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Local fallback
      setOrganizations(['Apex Global Industries', 'Titan Energy Corp', 'Nexa Manufacturing']);
      setContacts([
        { id: 'c-1', name: 'John Miller', email: 'john.miller@apex.com', phone: '+1 (555) 0142', designation: 'IT Manager', is_primary: true, is_secondary: false, tags: ['Apex Global Industries'] },
        { id: 'c-2', name: 'Sarah Jenkins', email: 'sarah.j@titan.com', phone: '+1 (555) 0199', designation: 'SAP Specialist', is_primary: false, is_secondary: true, tags: ['Titan Energy Corp', 'Nexa Manufacturing'] }
      ]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContactsData();
  }, []);

  const resetFormFields = () => {
    setName('');
    setEmail('');
    setPhone('');
    setDesignation('');
    setRoleType('normal');
    setSelectedOrgs([]);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !designation.trim()) {
      toast.error('Name, Email and Designation are required.');
      return;
    }

    const loadId = toast.loading(`Saving contact details for ${name}...`);

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Insert contact
        const { data: contact, error: contactErr } = await supabase
          .from('organization_contacts')
          .insert({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim() || null,
            designation: designation.trim(),
            is_primary: roleType === 'primary',
            is_secondary: roleType === 'secondary'
          })
          .select('*')
          .single();

        if (contactErr) throw contactErr;

        // 2. Insert tags
        if (selectedOrgs.length > 0) {
          const tagsToInsert = selectedOrgs.map(orgName => ({
            contact_id: contact.id,
            organization_name: orgName
          }));

          const { error: tagsErr } = await supabase
            .from('organization_contact_tags')
            .insert(tagsToInsert);

          if (tagsErr) throw tagsErr;
        }

        toast.success('Contact added successfully.', { id: loadId });
        setShowAddDialog(false);
        resetFormFields();
        fetchContactsData();
      } catch (err: unknown) {
        console.error('Error adding contact:', err);
        toast.error(`Save failed: ${getErrorMessage(err)}`, { id: loadId });
      }
    } else {
      // Local addition
      const newContact: ContactItem = {
        id: `c-${Date.now()}`,
        name,
        email,
        phone: phone || undefined,
        designation,
        is_primary: roleType === 'primary',
        is_secondary: roleType === 'secondary',
        tags: selectedOrgs
      };
      setContacts([...contacts, newContact]);
      toast.success('Contact added locally.', { id: loadId });
      setShowAddDialog(false);
      resetFormFields();
    }
  };

  const handleEditClick = (c: ContactItem) => {
    setEditingContact(c);
    setName(c.name);
    setEmail(c.email);
    setPhone(c.phone || '');
    setDesignation(c.designation);
    setRoleType(c.is_primary ? 'primary' : c.is_secondary ? 'secondary' : 'normal');
    setSelectedOrgs(c.tags);
    setShowEditDialog(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;

    const loadId = toast.loading(`Updating contact details for ${name}...`);

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Update contact details
        const { error: contactErr } = await supabase
          .from('organization_contacts')
          .update({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim() || null,
            designation: designation.trim(),
            is_primary: roleType === 'primary',
            is_secondary: roleType === 'secondary'
          })
          .eq('id', editingContact.id);

        if (contactErr) throw contactErr;

        // 2. Clear existing tags
        const { error: deleteTagsErr } = await supabase
          .from('organization_contact_tags')
          .delete()
          .eq('contact_id', editingContact.id);

        if (deleteTagsErr) throw deleteTagsErr;

        // 3. Re-insert new tags
        if (selectedOrgs.length > 0) {
          const tagsToInsert = selectedOrgs.map(orgName => ({
            contact_id: editingContact.id,
            organization_name: orgName
          }));

          const { error: insertTagsErr } = await supabase
            .from('organization_contact_tags')
            .insert(tagsToInsert);

          if (insertTagsErr) throw insertTagsErr;
        }

        toast.success('Contact updated successfully.', { id: loadId });
        setShowEditDialog(false);
        setEditingContact(null);
        resetFormFields();
        fetchContactsData();
      } catch (err: unknown) {
        console.error('Error updating contact:', err);
        toast.error(`Update failed: ${getErrorMessage(err)}`, { id: loadId });
      }
    } else {
      // Local edit
      const updated = contacts.map(c => 
        c.id === editingContact.id 
          ? {
              ...c,
              name,
              email,
              phone: phone || undefined,
              designation,
              is_primary: roleType === 'primary',
              is_secondary: roleType === 'secondary',
              tags: selectedOrgs
            }
          : c
      );
      setContacts(updated);
      toast.success('Contact updated locally.', { id: loadId });
      setShowEditDialog(false);
      setEditingContact(null);
      resetFormFields();
    }
  };

  const handleDeleteClick = async (c: ContactItem) => {
    if (!confirm(`Are you absolutely sure you want to delete contact ${c.name}?`)) return;

    const loadId = toast.loading(`Deleting contact ${c.name}...`);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('organization_contacts')
          .delete()
          .eq('id', c.id);

        if (error) throw error;
        toast.success('Contact removed from system.', { id: loadId });
        fetchContactsData();
      } catch (err: unknown) {
        console.error('Error deleting contact:', err);
        toast.error(`Deletion failed: ${getErrorMessage(err)}`, { id: loadId });
      }
    } else {
      setContacts(contacts.filter(item => item.id !== c.id));
      toast.success('Contact deleted locally.', { id: loadId });
    }
  };

  const handleTagToggle = (orgName: string) => {
    if (selectedOrgs.includes(orgName)) {
      setSelectedOrgs(selectedOrgs.filter(o => o !== orgName));
    } else {
      setSelectedOrgs([...selectedOrgs, orgName]);
    }
  };

  return (
    <div className="space-y-6 text-xs text-ink">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-line pb-4 bg-surface">
        <div>
          <h1 className="type-title text-ink flex items-center gap-2">
            <Users size={20} />
            Contacts Directory
          </h1>
          <p className="type-meta mt-1 text-ink-secondary">Manage system-wide organization contacts, support roles, and tenant tagging controls.</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if(!open) resetFormFields(); }}>
          <DialogTrigger asChild>
            <button
              className="px-3 py-2 bg-ink hover:bg-zinc-800 text-white rounded font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus size={12} />
              Add Contact
            </button>
          </DialogTrigger>
          <DialogContent className="bg-surface border border-line text-xs max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xs font-bold uppercase tracking-wider text-ink">Add Contact Profile</DialogTitle>
              <DialogDescription className="text-[11px] text-ink-secondary">
                Register a new authorized customer contact and assign organization tags.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Full Name *</Label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs h-9"
                  placeholder="e.g. John Miller"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Email Address *</Label>
                  <Input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs h-9"
                    placeholder="e.g. john@company.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Phone Number</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-xs h-9"
                    placeholder="e.g. +1 (555) 0142"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Designation *</Label>
                  <Input
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="text-xs h-9"
                    placeholder="e.g. IT Director"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Contact Role</Label>
                  <select
                    value={roleType}
                    onChange={(e: any) => setRoleType(e.target.value)}
                    className="w-full bg-surface border border-line rounded px-2.5 h-9 text-xs text-ink focus:outline-none focus:border-brand shadow-card"
                  >
                    <option value="normal">Authorized Requester</option>
                    <option value="primary">Primary Support Lead</option>
                    <option value="secondary">Secondary Contact</option>
                  </select>
                </div>
              </div>

              {/* Tags Area */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider block">Tagged Organizations</Label>
                <div className="border border-line rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-1.5 bg-surface-muted/60">
                  {organizations.map(org => {
                    const isChecked = selectedOrgs.includes(org);
                    return (
                      <div 
                        key={org}
                        onClick={() => handleTagToggle(org)}
                        className={`flex items-center justify-between p-2 rounded border text-[11px] font-sans font-medium cursor-pointer transition ${
                          isChecked ? 'bg-ink border-ink text-white' : 'bg-surface border-line text-ink-secondary hover:bg-surface-muted'
                        }`}
                      >
                        <span>{org}</span>
                        {isChecked && <Badge className="bg-surface text-ink border-none font-bold text-[11px] px-1 py-0 shadow-none leading-tight hover:bg-surface">TAGGED</Badge>}
                      </div>
                    );
                  })}
                  {organizations.length === 0 && (
                    <p className="text-[11px] text-ink-muted italic py-2 text-center">No active organizations found to tag.</p>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddDialog(false)}
                  className="text-[11px] font-bold uppercase h-9"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-ink hover:bg-zinc-800 text-white font-bold uppercase tracking-wider text-[11px] h-9"
                >
                  Save Profile
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Table Card */}
      <Card className="bg-surface border border-line rounded overflow-hidden shadow-card">
        <div className="overflow-x-auto"><table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-muted border-b border-line uppercase font-bold text-[11px] tracking-wider text-ink-secondary">
              <th className="p-4">Contact Info</th>
              <th className="p-4">Designation</th>
              <th className="p-4">Metadata / Role</th>
              <th className="p-4">Tagged Organizations</th>
              <th className="p-4 text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-ink-muted">
                  Loading contacts directory telemetry...
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-ink-muted">
                  No organization contacts registered.
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="hover:bg-surface-muted/60 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-subtle border border-line flex items-center justify-center text-ink font-bold uppercase shrink-0">
                        {c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <span className="font-bold text-ink text-xs block">{c.name}</span>
                        <div className="flex items-center gap-3 text-[11px] text-ink-muted mt-0.5">
                          <span className="flex items-center gap-1"><Mail size={11} /> {c.email}</span>
                          {c.phone && <span className="flex items-center gap-1"><Phone size={11} /> {c.phone}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-ink-secondary">{c.designation}</td>
                  <td className="p-4">
                    {c.is_primary ? (
                      <Badge className="bg-ink text-white text-[11px] tracking-wider flex items-center gap-1 rounded py-0.5 px-1.5 hover:bg-ink border-0 leading-none h-5">
                        <ShieldCheck size={11} />
                        <span>Primary Lead</span>
                      </Badge>
                    ) : c.is_secondary ? (
                      <Badge className="bg-surface-subtle text-ink border-line text-[11px] tracking-wider flex items-center gap-1 rounded py-0.5 px-1.5 hover:bg-surface-subtle leading-none h-5">
                        <UserCheck size={11} className="text-ink-secondary" />
                        <span>Secondary</span>
                      </Badge>
                    ) : (
                      <Badge className="bg-surface-muted text-ink-secondary border-line text-[11px] tracking-wider flex items-center gap-1 rounded py-0.5 px-1.5 hover:bg-surface-muted leading-none h-5">
                        <span>Requester</span>
                      </Badge>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map(org => (
                        <span 
                          key={org} 
                          className="bg-surface-subtle text-ink-secondary px-2 py-0.5 rounded text-[11px] font-semibold border border-line"
                        >
                          {org}
                        </span>
                      ))}
                      {c.tags.length === 0 && (
                        <span className="text-ink-muted italic">No organizations tagged</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleEditClick(c)}
                        className="h-7 w-7 border-line text-ink-secondary hover:text-ink cursor-pointer"
                        title="Edit Contact"
                      >
                        <Edit size={12} />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleDeleteClick(c)}
                        className="h-7 w-7 hover:bg-red-50 text-ink-muted hover:text-red-750 border-line cursor-pointer"
                        title="Remove Contact"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table></div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if(!open) resetFormFields(); }}>
        <DialogContent className="bg-surface border border-line text-xs max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xs font-bold uppercase tracking-wider text-ink">Edit Contact Profile</DialogTitle>
            <DialogDescription className="text-[11px] text-ink-secondary">
              Update authorized customer contact details and organization mapping.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Full Name *</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Email Address *</Label>
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Phone Number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Designation *</Label>
                <Input
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Contact Role</Label>
                <select
                  value={roleType}
                  onChange={(e: any) => setRoleType(e.target.value)}
                  className="w-full bg-surface border border-line rounded px-2.5 h-9 text-xs text-ink focus:outline-none focus:border-brand shadow-card"
                >
                  <option value="normal">Authorized Requester</option>
                  <option value="primary">Primary Support Lead</option>
                  <option value="secondary">Secondary Contact</option>
                </select>
              </div>
            </div>

            {/* Tags Area */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider block">Tagged Organizations</Label>
              <div className="border border-line rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-1.5 bg-surface-muted/60">
                {organizations.map(org => {
                  const isChecked = selectedOrgs.includes(org);
                  return (
                    <div 
                      key={org}
                      onClick={() => handleTagToggle(org)}
                      className={`flex items-center justify-between p-2 rounded border text-[11px] font-sans font-medium cursor-pointer transition ${
                        isChecked ? 'bg-ink border-ink text-white' : 'bg-surface border-line text-ink-secondary hover:bg-surface-muted'
                      }`}
                    >
                      <span>{org}</span>
                      {isChecked && <Badge className="bg-surface text-ink border-none font-bold text-[11px] px-1 py-0 shadow-none leading-tight hover:bg-surface">TAGGED</Badge>}
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditDialog(false)}
                className="text-[11px] font-bold uppercase h-9"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-ink hover:bg-zinc-800 text-white font-bold uppercase tracking-wider text-[11px] h-9"
              >
                Update Details
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
