-- migration: fix protect_system_and_immutable_fields() TG_OP case
-- purpose:
-- - fix a bug where TG_OP was compared against lowercase strings ('update'/'delete')
-- - in Postgres, TG_OP returns uppercase values ('UPDATE'/'DELETE')
-- - because of that mismatch, the function always fell through to `return null;`
--   which silently CANCELLED updates/deletes (statement affects 0 rows)
--
-- impact:
-- - DELETE on public.collections/public.topics was effectively impossible
-- - UPDATE on those tables could also be silently cancelled
--
begin;

create or replace function public.protect_system_and_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  -- NOTE: TG_OP is uppercase in Postgres ('UPDATE'/'DELETE').

  -- block updates to name/system_key in mvp (name is treated as immutable identifier)
  if tg_op = 'UPDATE' then
    if new.name is distinct from old.name then
      raise exception 'name is immutable in mvp';
    end if;
    if new.system_key is distinct from old.system_key then
      raise exception 'system_key is immutable in mvp';
    end if;
    return new;
  end if;

  -- block deletion of system entities (e.g. random_collection/random_topic)
  if tg_op = 'DELETE' then
    if old.system_key is not null then
      raise exception 'cannot delete system entity';
    end if;
    return old;
  end if;

  -- defensive: for unexpected operations, do not cancel statement
  return coalesce(new, old);
end;
$$;

commit;

