-- migration: create initial schema for 10xfacts (mvp)
-- purpose:
-- - create core tables: public.profiles, public.collections, public.topics, public.flashcards, public.ai_generation_events
-- - add constraints and indexes per db plan
-- - enable row level security (rls) on all new tables
-- - add granular rls policies for roles: anon, authenticated
-- - add triggers/functions:
--   - set_updated_at() for updated_at columns
--   - immutability protection for collections/topics names and system keys
--   - protect deletion of system entities (random_* records)
--   - protect immutability of flashcards.source
--   - set flashcards.edited_by_user when content changes
--   - create per-user system entities after signup (auth.users insert trigger)
-- notes:
-- - all sql is intentionally lowercase for consistency
-- - data-destructive operations: none (no truncate/drop table). this migration is safe to run on an empty database.
-- - this migration uses "drop ... if exists" for triggers/policies to be idempotent; it only affects objects with the exact same names.

begin;

-- ensure required extensions exist
-- gen_random_uuid() is provided by pgcrypto on supabase.
create extension if not exists pgcrypto;

-- =====================================================================
-- helper functions
-- =====================================================================

-- set updated_at to now() on update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- collections/topics immutability + system delete protection
create or replace function public.protect_system_and_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  -- block updates to name/system_key in mvp (name is treated as immutable identifier)
  if tg_op = 'update' then
    if new.name is distinct from old.name then
      raise exception 'name is immutable in mvp';
    end if;
    if new.system_key is distinct from old.system_key then
      raise exception 'system_key is immutable in mvp';
    end if;
    return new;
  end if;

  -- block deletion of system entities (e.g. random_collection/random_topic)
  if tg_op = 'delete' then
    if old.system_key is not null then
      raise exception 'cannot delete system entity';
    end if;
    return old;
  end if;

  return null;
end;
$$;

-- flashcards: protect immutability of source and set edited_by_user if content changes
create or replace function public.flashcards_before_update()
returns trigger
language plpgsql
as $$
begin
  -- source is immutable (manual vs ai)
  if new.source is distinct from old.source then
    raise exception 'flashcard source is immutable';
  end if;

  -- once edited_by_user becomes true, keep it true
  if old.edited_by_user = true then
    new.edited_by_user = true;
  else
    if new.front is distinct from old.front or new.back is distinct from old.back then
      new.edited_by_user = true;
    end if;
  end if;

  return new;
end;
$$;

-- ai_generation_events: if topic_id is provided, enforce that the topic belongs to the same user_id
create or replace function public.ai_generation_events_validate_topic_owner()
returns trigger
language plpgsql
as $$
declare
  v_exists boolean;
begin
  if new.topic_id is null then
    return new;
  end if;

  select exists (
    select 1
    from public.topics t
    where t.id = new.topic_id
      and t.user_id = new.user_id
  ) into v_exists;

  if v_exists is not true then
    raise exception 'topic_id must belong to user_id';
  end if;

  return new;
end;
$$;

-- =====================================================================
-- tables
-- =====================================================================

-- profiles: 1:1 with auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- collections: user-owned, with per-user system collection (random)
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  system_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint collections_name_not_blank check (btrim(name) <> ''),
  constraint collections_name_len check (char_length(name) <= 120),
  -- note: db plan had a typo. intended behavior is: system_key can be null, otherwise must be from an allowlist.
  constraint collections_system_key_allowlist check (system_key is null or system_key in ('random_collection')),
  constraint collections_unique_name_per_user unique (user_id, name),
  constraint collections_unique_id_user unique (id, user_id)
);

-- topics: belong to a collection and user; enforce same-owner through composite fk
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  collection_id uuid not null,
  name text not null,
  description text not null default '',
  system_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint topics_fk_collection_owner
    foreign key (collection_id, user_id)
    references public.collections (id, user_id)
    on delete cascade,

  constraint topics_name_not_blank check (btrim(name) <> ''),
  constraint topics_name_len check (char_length(name) <= 120),
  constraint topics_description_len check (char_length(description) <= 10000),
  constraint topics_system_key_allowlist check (system_key is null or system_key in ('random_topic')),
  constraint topics_unique_name_in_collection unique (user_id, collection_id, name),
  constraint topics_unique_id_user unique (id, user_id)
);

-- flashcards: belong to a topic and user; enforce same-owner through composite fk
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic_id uuid not null,
  front text not null,
  back text not null,
  source text not null,
  is_favorite boolean not null default false,
  edited_by_user boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint flashcards_fk_topic_owner
    foreign key (topic_id, user_id)
    references public.topics (id, user_id)
    on delete cascade,

  constraint flashcards_front_not_blank check (btrim(front) <> ''),
  constraint flashcards_back_not_blank check (btrim(back) <> ''),
  constraint flashcards_front_len check (char_length(front) <= 200),
  constraint flashcards_back_len check (char_length(back) <= 600),
  constraint flashcards_source_allowlist check (source in ('manually_created', 'auto_generated'))
);

-- ai generation events: per user; topic_id is nullable and does not cascade delete (preserve metrics + prevent limit bypass)
create table if not exists public.ai_generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid null references public.topics (id) on delete set null,
  status text not null,
  is_random boolean not null default false,
  random_domain_label text null,
  model text null,
  prompt_tokens integer null,
  completion_tokens integer null,
  latency_ms integer null,
  created_at timestamptz not null default now(),
  day_utc date generated always as ((created_at at time zone 'utc')::date) stored,

  constraint ai_generation_events_status_allowlist check (status in ('accepted', 'rejected', 'skipped', 'failed')),
  constraint ai_generation_events_prompt_tokens_nonneg check (prompt_tokens is null or prompt_tokens >= 0),
  constraint ai_generation_events_completion_tokens_nonneg check (completion_tokens is null or completion_tokens >= 0),
  constraint ai_generation_events_latency_ms_nonneg check (latency_ms is null or latency_ms >= 0)
);

-- =====================================================================
-- indexes
-- =====================================================================

-- collections
create unique index if not exists collections_unique_system_key_per_user
  on public.collections (user_id, system_key)
  where system_key is not null;

create index if not exists collections_user_created_at_desc_idx
  on public.collections (user_id, created_at desc);

-- topics
create unique index if not exists topics_unique_system_key_per_user
  on public.topics (user_id, system_key)
  where system_key is not null;

create index if not exists topics_collection_created_at_desc_idx
  on public.topics (collection_id, created_at desc);

-- flashcards
create index if not exists flashcards_topic_created_at_desc_idx
  on public.flashcards (topic_id, created_at desc);

create index if not exists flashcards_user_favorite_true_idx
  on public.flashcards (user_id, is_favorite)
  where is_favorite = true;

create index if not exists flashcards_topic_favorite_true_idx
  on public.flashcards (topic_id, is_favorite)
  where is_favorite = true;

create index if not exists flashcards_topic_source_idx
  on public.flashcards (topic_id, source);

-- ai_generation_events
create index if not exists ai_generation_events_user_day_utc_idx
  on public.ai_generation_events (user_id, day_utc);

create index if not exists ai_generation_events_user_day_utc_success_idx
  on public.ai_generation_events (user_id, day_utc)
  where status in ('accepted', 'rejected', 'skipped');

create index if not exists ai_generation_events_day_utc_idx
  on public.ai_generation_events (day_utc);

create index if not exists ai_generation_events_is_random_day_utc_idx
  on public.ai_generation_events (is_random, day_utc);

-- =====================================================================
-- triggers
-- =====================================================================

-- updated_at maintenance
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at
before update on public.collections
for each row
execute function public.set_updated_at();

drop trigger if exists topics_set_updated_at on public.topics;
create trigger topics_set_updated_at
before update on public.topics
for each row
execute function public.set_updated_at();

drop trigger if exists flashcards_set_updated_at on public.flashcards;
create trigger flashcards_set_updated_at
before update on public.flashcards
for each row
execute function public.set_updated_at();

-- immutability + system deletion protection
drop trigger if exists collections_protect_system_and_immutable_fields on public.collections;
create trigger collections_protect_system_and_immutable_fields
before update or delete on public.collections
for each row
execute function public.protect_system_and_immutable_fields();

drop trigger if exists topics_protect_system_and_immutable_fields on public.topics;
create trigger topics_protect_system_and_immutable_fields
before update or delete on public.topics
for each row
execute function public.protect_system_and_immutable_fields();

-- flashcards protections
drop trigger if exists flashcards_before_update_trg on public.flashcards;
create trigger flashcards_before_update_trg
before update on public.flashcards
for each row
execute function public.flashcards_before_update();

-- ai_generation_events topic ownership validation
drop trigger if exists ai_generation_events_validate_topic_owner_trg on public.ai_generation_events;
create trigger ai_generation_events_validate_topic_owner_trg
before insert or update on public.ai_generation_events
for each row
execute function public.ai_generation_events_validate_topic_owner();

-- =====================================================================
-- rls
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.topics enable row level security;
alter table public.flashcards enable row level security;
alter table public.ai_generation_events enable row level security;

-- ---------------------------------------------------------------------
-- rls policies: profiles
-- ---------------------------------------------------------------------

-- rationale: users can see their own profile, but cannot modify admin flag.
-- writes are performed only by service role / security definer triggers/functions.

drop policy if exists profiles_select_anon on public.profiles;
create policy profiles_select_anon
on public.profiles
for select
to anon
using (id = auth.uid());

drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- explicit deny policies for write operations (document intent)
drop policy if exists profiles_insert_anon on public.profiles;
create policy profiles_insert_anon
on public.profiles
for insert
to anon
with check (false);

drop policy if exists profiles_insert_authenticated on public.profiles;
create policy profiles_insert_authenticated
on public.profiles
for insert
to authenticated
with check (false);

drop policy if exists profiles_update_anon on public.profiles;
create policy profiles_update_anon
on public.profiles
for update
to anon
using (false)
with check (false);

drop policy if exists profiles_update_authenticated on public.profiles;
create policy profiles_update_authenticated
on public.profiles
for update
to authenticated
using (false)
with check (false);

drop policy if exists profiles_delete_anon on public.profiles;
create policy profiles_delete_anon
on public.profiles
for delete
to anon
using (false);

drop policy if exists profiles_delete_authenticated on public.profiles;
create policy profiles_delete_authenticated
on public.profiles
for delete
to authenticated
using (false);

-- ---------------------------------------------------------------------
-- rls policies: collections
-- ---------------------------------------------------------------------

-- anon: no access (api is authenticated-only in mvp)
drop policy if exists collections_select_anon on public.collections;
create policy collections_select_anon
on public.collections
for select
to anon
using (false);

drop policy if exists collections_insert_anon on public.collections;
create policy collections_insert_anon
on public.collections
for insert
to anon
with check (false);

drop policy if exists collections_update_anon on public.collections;
create policy collections_update_anon
on public.collections
for update
to anon
using (false)
with check (false);

drop policy if exists collections_delete_anon on public.collections;
create policy collections_delete_anon
on public.collections
for delete
to anon
using (false);

-- authenticated: owner-only access
drop policy if exists collections_select_authenticated on public.collections;
create policy collections_select_authenticated
on public.collections
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists collections_insert_authenticated on public.collections;
create policy collections_insert_authenticated
on public.collections
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists collections_update_authenticated on public.collections;
create policy collections_update_authenticated
on public.collections
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists collections_delete_authenticated on public.collections;
create policy collections_delete_authenticated
on public.collections
for delete
to authenticated
using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- rls policies: topics
-- ---------------------------------------------------------------------

-- anon: no access
drop policy if exists topics_select_anon on public.topics;
create policy topics_select_anon
on public.topics
for select
to anon
using (false);

drop policy if exists topics_insert_anon on public.topics;
create policy topics_insert_anon
on public.topics
for insert
to anon
with check (false);

drop policy if exists topics_update_anon on public.topics;
create policy topics_update_anon
on public.topics
for update
to anon
using (false)
with check (false);

drop policy if exists topics_delete_anon on public.topics;
create policy topics_delete_anon
on public.topics
for delete
to anon
using (false);

-- authenticated: owner-only access
drop policy if exists topics_select_authenticated on public.topics;
create policy topics_select_authenticated
on public.topics
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists topics_insert_authenticated on public.topics;
create policy topics_insert_authenticated
on public.topics
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists topics_update_authenticated on public.topics;
create policy topics_update_authenticated
on public.topics
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists topics_delete_authenticated on public.topics;
create policy topics_delete_authenticated
on public.topics
for delete
to authenticated
using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- rls policies: flashcards
-- ---------------------------------------------------------------------

-- anon: no access
drop policy if exists flashcards_select_anon on public.flashcards;
create policy flashcards_select_anon
on public.flashcards
for select
to anon
using (false);

drop policy if exists flashcards_insert_anon on public.flashcards;
create policy flashcards_insert_anon
on public.flashcards
for insert
to anon
with check (false);

drop policy if exists flashcards_update_anon on public.flashcards;
create policy flashcards_update_anon
on public.flashcards
for update
to anon
using (false)
with check (false);

drop policy if exists flashcards_delete_anon on public.flashcards;
create policy flashcards_delete_anon
on public.flashcards
for delete
to anon
using (false);

-- authenticated: owner-only access
drop policy if exists flashcards_select_authenticated on public.flashcards;
create policy flashcards_select_authenticated
on public.flashcards
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists flashcards_insert_authenticated on public.flashcards;
create policy flashcards_insert_authenticated
on public.flashcards
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists flashcards_update_authenticated on public.flashcards;
create policy flashcards_update_authenticated
on public.flashcards
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists flashcards_delete_authenticated on public.flashcards;
create policy flashcards_delete_authenticated
on public.flashcards
for delete
to authenticated
using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- rls policies: ai_generation_events
-- ---------------------------------------------------------------------

-- anon: no access
drop policy if exists ai_generation_events_select_anon on public.ai_generation_events;
create policy ai_generation_events_select_anon
on public.ai_generation_events
for select
to anon
using (false);

drop policy if exists ai_generation_events_insert_anon on public.ai_generation_events;
create policy ai_generation_events_insert_anon
on public.ai_generation_events
for insert
to anon
with check (false);

drop policy if exists ai_generation_events_update_anon on public.ai_generation_events;
create policy ai_generation_events_update_anon
on public.ai_generation_events
for update
to anon
using (false)
with check (false);

drop policy if exists ai_generation_events_delete_anon on public.ai_generation_events;
create policy ai_generation_events_delete_anon
on public.ai_generation_events
for delete
to anon
using (false);

-- authenticated: owner-only access
drop policy if exists ai_generation_events_select_authenticated on public.ai_generation_events;
create policy ai_generation_events_select_authenticated
on public.ai_generation_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists ai_generation_events_insert_authenticated on public.ai_generation_events;
create policy ai_generation_events_insert_authenticated
on public.ai_generation_events
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists ai_generation_events_update_authenticated on public.ai_generation_events;
create policy ai_generation_events_update_authenticated
on public.ai_generation_events
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists ai_generation_events_delete_authenticated on public.ai_generation_events;
create policy ai_generation_events_delete_authenticated
on public.ai_generation_events
for delete
to authenticated
using (user_id = auth.uid());

-- =====================================================================
-- signup automation: create profile + system collection/topic per user
-- =====================================================================

-- security definer is used so the trigger can insert regardless of rls on target tables.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_collection_id uuid;
begin
  -- create profile (is_admin defaults to false)
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  -- create system collection for random mode (per-user)
  insert into public.collections (user_id, name, system_key)
  values (new.id, 'kolekcja losowa', 'random_collection')
  -- note: collections_unique_system_key_per_user is a partial unique index, so the on conflict target must include the same predicate.
  -- we intentionally do not update immutable fields (name/system_key) to avoid breaking immutability guarantees.
  on conflict (user_id, system_key) where system_key is not null do nothing
  returning id into v_collection_id;

  -- if the insert hit the conflict path, returning may be null; fetch id
  if v_collection_id is null then
    select c.id into v_collection_id
    from public.collections c
    where c.user_id = new.id and c.system_key = 'random_collection';
  end if;

  -- create system topic inside that collection
  insert into public.topics (user_id, collection_id, name, description, system_key)
  values (new.id, v_collection_id, 'temat losowy', 'example description.', 'random_topic')
  -- note: topics_unique_system_key_per_user is a partial unique index, so the on conflict target must include the same predicate.
  -- we keep system topic immutable; on conflict we simply keep the existing row.
  on conflict (user_id, system_key) where system_key is not null do nothing;

  return new;
end;
$$;

-- attach trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- =====================================================================
-- admin metrics (no access to user content tables)
-- =====================================================================

-- helper: checks current caller's admin flag
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- daily aggregates for ai generation events (no user-level data is returned)
create or replace function public.get_admin_metrics_daily(p_from date, p_to date)
returns table (
  day_utc date,
  accepted bigint,
  rejected bigint,
  skipped bigint,
  failed bigint,
  random_events bigint,
  non_random_events bigint
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- rationale: admins should not have raw table access; only aggregates are exposed through security definer functions.
  if public.is_admin() is not true then
    raise exception 'not authorized';
  end if;

  return query
  select
    e.day_utc,
    count(*) filter (where e.status = 'accepted') as accepted,
    count(*) filter (where e.status = 'rejected') as rejected,
    count(*) filter (where e.status = 'skipped') as skipped,
    count(*) filter (where e.status = 'failed') as failed,
    count(*) filter (where e.is_random = true) as random_events,
    count(*) filter (where e.is_random = false) as non_random_events
  from public.ai_generation_events e
  where e.day_utc between p_from and p_to
  group by e.day_utc
  order by e.day_utc asc;
end;
$$;

-- lock down function execution to authenticated users (auth required). authorization is enforced inside via public.is_admin().
revoke all on function public.is_admin() from public;
revoke all on function public.get_admin_metrics_daily(date, date) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_admin_metrics_daily(date, date) to authenticated;

commit;

