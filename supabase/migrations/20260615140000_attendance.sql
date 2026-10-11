-- Attendance table for Glory Music Center
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references public.registrations(id) on delete set null,
  student_id text not null,
  student_name text not null,
  course text not null,
  schedule text not null,
  date date not null default current_date,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  time_in text,
  remarks text,
  recorded_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, date)
);

create index if not exists idx_attendance_date on public.attendance (date);
create index if not exists idx_attendance_student_id on public.attendance (student_id);
create index if not exists idx_attendance_course on public.attendance (course);

grant select, insert, update, delete on public.attendance to authenticated;
grant all on public.attendance to service_role;

alter table public.attendance enable row level security;

-- Only admins can view, record, or modify attendance
drop policy if exists "Admins can view attendance" on public.attendance;
create policy "Admins can view attendance"
on public.attendance for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can insert attendance" on public.attendance;
create policy "Admins can insert attendance"
on public.attendance for insert to authenticated
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update attendance" on public.attendance;
create policy "Admins can update attendance"
on public.attendance for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete attendance" on public.attendance;
create policy "Admins can delete attendance"
on public.attendance for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));
