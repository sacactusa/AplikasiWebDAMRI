create table if not exists public.coordinator_archives (
  id uuid primary key default gen_random_uuid(),
  coordinator_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  start_date date not null,
  end_date date not null,
  segment text not null,
  departures jsonb not null check (jsonb_typeof(departures) = 'array'),
  created_at timestamptz not null default now(),
  constraint coordinator_archives_valid_period check (start_date <= end_date)
);

create index if not exists coordinator_archives_owner_created_idx
  on public.coordinator_archives (coordinator_id, created_at desc);

create table if not exists public.coordinator_archive_downloads (
  id uuid primary key default gen_random_uuid(),
  coordinator_id uuid not null references auth.users (id) on delete cascade,
  archive_id uuid not null references public.coordinator_archives (id) on delete cascade,
  archive_label text not null,
  downloaded_at timestamptz not null default now(),
  size_bytes bigint not null check (size_bytes >= 0),
  successful boolean not null default true
);

create index if not exists coordinator_archive_downloads_owner_time_idx
  on public.coordinator_archive_downloads (coordinator_id, downloaded_at desc);

alter table public.coordinator_archives enable row level security;
alter table public.coordinator_archive_downloads enable row level security;

grant select, insert on public.coordinator_archives to authenticated;
grant select, insert on public.coordinator_archive_downloads to authenticated;

drop policy if exists "Coordinators read own archives"
  on public.coordinator_archives;
create policy "Coordinators read own archives"
  on public.coordinator_archives
  for select to authenticated
  using (coordinator_id = (select auth.uid()));

drop policy if exists "Coordinators create own archives"
  on public.coordinator_archives;
create policy "Coordinators create own archives"
  on public.coordinator_archives
  for insert to authenticated
  with check (coordinator_id = (select auth.uid()));

drop policy if exists "Coordinators read own archive downloads"
  on public.coordinator_archive_downloads;
create policy "Coordinators read own archive downloads"
  on public.coordinator_archive_downloads
  for select to authenticated
  using (coordinator_id = (select auth.uid()));

drop policy if exists "Coordinators record own archive downloads"
  on public.coordinator_archive_downloads;
create policy "Coordinators record own archive downloads"
  on public.coordinator_archive_downloads
  for insert to authenticated
  with check (
    coordinator_id = (select auth.uid())
    and exists (
      select 1
      from public.coordinator_archives archive
      where archive.id = coordinator_archive_downloads.archive_id
        and archive.coordinator_id = (select auth.uid())
    )
  );
