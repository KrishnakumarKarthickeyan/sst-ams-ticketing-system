-- Drop old notifications table if it exists to resolve schema definition conflict
drop table if exists public.notifications cascade;

-- Create notifications table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,            -- e.g. 'escalation_ack','reopen_approved'
  title text not null,
  message text not null,
  ticket_id varchar(50) references public.tickets(id) on delete cascade,
  link_path text,                -- e.g. '/customer/tickets/<id>'
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Index for unread notifications
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies
drop policy if exists n_select on public.notifications;
create policy n_select on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists n_update_own on public.notifications;
create policy n_update_own on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists n_insert_admin on public.notifications;
create policy n_insert_admin on public.notifications for insert to authenticated
  with check (public.is_manager_or_admin());

-- Add columns on tickets for escalation acknowledgment
alter table public.tickets
  add column if not exists escalation_acknowledged_at timestamptz,
  add column if not exists escalation_acknowledged_by uuid references public.profiles(id);
