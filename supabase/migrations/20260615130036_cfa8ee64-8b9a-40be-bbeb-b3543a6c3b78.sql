-- Roles enum
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

-- user_roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

drop policy if exists "Users can view their own roles" on public.user_roles;
create policy "Users can view their own roles"
on public.user_roles for select to authenticated
using (auth.uid() = user_id);

-- role check helper
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- registrations admin policies
drop policy if exists "Admins can view registrations" on public.registrations;
create policy "Admins can view registrations"
on public.registrations for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update registrations" on public.registrations;
create policy "Admins can update registrations"
on public.registrations for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete registrations" on public.registrations;
create policy "Admins can delete registrations"
on public.registrations for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- ensure public insert policy exists
drop policy if exists "Anyone can submit a registration" on public.registrations;
create policy "Anyone can submit a registration"
on public.registrations for insert to anon, authenticated
with check (true);
