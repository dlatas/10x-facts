-- migration: disable rls enforcement on core tables
-- purpose:
-- - disable row level security on all core tables created in the initial schema migration
-- - this effectively disables all rls policies on those tables (policies remain defined, but are not enforced while rls is disabled)
-- notes:
-- - non-destructive: no data changes and no policy drops
-- - safe to run even if some tables do not exist (uses "alter table if exists")

begin;

-- disable rls (policies are not evaluated when rls is disabled)
alter table if exists public.profiles disable row level security;
alter table if exists public.collections disable row level security;
alter table if exists public.topics disable row level security;
alter table if exists public.flashcards disable row level security;
alter table if exists public.ai_generation_events disable row level security;

-- ensure rls is not forced (defensive; typically not set unless explicitly enabled)
alter table if exists public.profiles no force row level security;
alter table if exists public.collections no force row level security;
alter table if exists public.topics no force row level security;
alter table if exists public.flashcards no force row level security;
alter table if exists public.ai_generation_events no force row level security;

commit;

