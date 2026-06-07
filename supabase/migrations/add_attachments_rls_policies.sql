-- Row Level Security (RLS) Policies for Ticket Attachments and Comment Attachments
-- Assist360 SAP Ticketing System Secure Registry
-- Path: supabase/migrations/add_attachments_rls_policies.sql

-- ==========================================
-- 1. Table: public.ticket_attachments
-- ==========================================

-- Enable RLS on the table
alter table public.ticket_attachments enable row level security;

-- Drop existing policies if they exist to avoid duplication
drop policy if exists "Admin/Manager full access on attachments" on public.ticket_attachments;
drop policy if exists "Consultant access on assigned ticket attachments" on public.ticket_attachments;
drop policy if exists "Customer access on organization ticket attachments" on public.ticket_attachments;

-- Policy 1.1: SuperAdmin/Manager full CRUD access
create policy "Admin/Manager full access on attachments"
on public.ticket_attachments
for all
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('SuperAdmin', 'Manager')
  )
);

-- Policy 1.2: Consultants read/write access for assigned tickets
create policy "Consultant access on assigned ticket attachments"
on public.ticket_attachments
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role = 'Consultant'
  )
  and exists (
    select 1 from public.tickets t
    where t.id = ticket_attachments.ticket_id
    and (t.assigned_consultant_id = auth.uid() or t.primary_consultant_id = auth.uid())
  )
);

-- Policy 1.3: Customers read/write access for their organization's tickets only
create policy "Customer access on organization ticket attachments"
on public.ticket_attachments
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role = 'Customer'
    and p.organization_id = (
      select organization_id from public.tickets t
      where t.id = ticket_attachments.ticket_id
    )
  )
);


-- ==========================================
-- 2. Table: public.ticket_comment_attachments
-- ==========================================

-- Enable RLS on the table
alter table public.ticket_comment_attachments enable row level security;

-- Drop existing policies if they exist to avoid duplication
drop policy if exists "Admin/Manager full access on comment attachments" on public.ticket_comment_attachments;
drop policy if exists "Consultant access on comment attachments" on public.ticket_comment_attachments;
drop policy if exists "Customer access on comment attachments" on public.ticket_comment_attachments;

-- Policy 2.1: SuperAdmin/Manager full CRUD access
create policy "Admin/Manager full access on comment attachments"
on public.ticket_comment_attachments
for all
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('SuperAdmin', 'Manager')
  )
);

-- Policy 2.2: Consultants read/write access for assigned tickets' comment attachments
create policy "Consultant access on comment attachments"
on public.ticket_comment_attachments
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role = 'Consultant'
  )
  and exists (
    select 1 from public.tickets t
    where t.id = ticket_comment_attachments.ticket_id
    and (t.assigned_consultant_id = auth.uid() or t.primary_consultant_id = auth.uid())
  )
);

-- Policy 2.3: Customers read/write access for organization tickets (excluding internal notes)
create policy "Customer access on comment attachments"
on public.ticket_comment_attachments
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role = 'Customer'
    and p.organization_id = (
      select organization_id from public.tickets t
      where t.id = ticket_comment_attachments.ticket_id
    )
  )
  -- Enforce that customers cannot view files attached to internal notes
  and not exists (
    select 1 from public.ticket_comments tc
    where tc.id = ticket_comment_attachments.comment_id
    and tc.is_internal = true
  )
);
