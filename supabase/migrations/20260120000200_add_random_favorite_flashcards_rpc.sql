-- migration: add rpc for random favorite flashcards
-- purpose:
-- - provide efficient endpoint support for random favorites without pulling large samples
-- - returns only rows belonging to the authenticated user (auth.uid())
-- notes:
-- - rls may be disabled in dev; we still filter by user_id explicitly
-- - when rls is re-enabled later, this function remains safe (invoker + auth.uid filter)

begin;

create or replace function public.get_random_favorite_flashcards(p_limit int)
returns table (
  id uuid,
  front text,
  back text,
  topic_id uuid
)
language sql
volatile
security invoker
as $$
  select
    f.id,
    f.front,
    f.back,
    f.topic_id
  from public.flashcards f
  where f.user_id = auth.uid()
    and f.is_favorite = true
  order by random()
  limit least(greatest(p_limit, 1), 20);
$$;

grant execute on function public.get_random_favorite_flashcards(int) to authenticated;

commit;

