-- Relax insert policy for notifications to allow any authenticated user to insert notifications
drop policy if exists n_insert_admin on public.notifications;

create policy n_insert_all on public.notifications for insert to authenticated
  with check (true);
