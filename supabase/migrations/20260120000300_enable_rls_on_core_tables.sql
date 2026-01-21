-- migration: enable rls enforcement on core tables (and ensure policies exist)
-- purpose:
-- - re-enable row level security on core tables created in the initial schema migration
-- - (re)create canonical rls policies for anon/authenticated roles
-- why:
-- - there is an earlier dev migration that disables rls to unblock development
-- - when rls gets toggled manually in the dashboard, environments can drift
-- - missing DELETE policies manifest as "0 rows deleted" (PostgREST) and app-level "forbidden" errors
--
-- notes:
-- - idempotent: uses "alter table if exists" and "drop policy if exists"
-- - intended to be applied AFTER:
--   - 20260115000000_create_initial_schema.sql
--   - 20260115000101_disable_rls_on_core_tables.sql
--
-- IMPORTANT:
-- - this migration defines policies with the exact same names as in the initial schema migration
-- - if you have customized policies in the database, this will overwrite them (by dropping/recreating)
--
begin;

-- =====================================================================
-- enable rls (policies are evaluated only when rls is enabled)
-- =====================================================================
alter table if exists public.profiles enable row level security;
alter table if exists public.collections enable row level security;
alter table if exists public.topics enable row level security;
alter table if exists public.flashcards enable row level security;
alter table if exists public.ai_generation_events enable row level security;

-- defensive: do not FORCE rls (service role / security definer should still work as designed)
alter table if exists public.profiles no force row level security;
alter table if exists public.collections no force row level security;
alter table if exists public.topics no force row level security;
alter table if exists public.flashcards no force row level security;
alter table if exists public.ai_generation_events no force row level security;

-- =====================================================================
-- rls policies: profiles
-- =====================================================================

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

-- =====================================================================
-- rls policies: collections
-- =====================================================================

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

-- =====================================================================
-- rls policies: topics
-- =====================================================================

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

-- =====================================================================
-- rls policies: flashcards
-- =====================================================================

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

-- =====================================================================
-- rls policies: ai_generation_events
-- =====================================================================

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

commit;

