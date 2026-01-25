import type { PostgrestError } from '@supabase/supabase-js';

import type { SupabaseClient } from '@/db/supabase.client';
import type { CreateTopicCommand, TopicDto, TopicsListQuery } from '@/types';

export class TopicsServiceError extends Error {
  readonly kind:
    | 'collection_not_found'
    | 'topic_not_found'
    | 'forbidden_system';

  constructor(kind: TopicsServiceError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

const TOPIC_FIELDS =
  'id,name,description,system_key,created_at,updated_at' as const;
const TOPIC_FIELDS_WITH_COUNTS =
  'id,name,description,system_key,created_at,updated_at, flashcards:flashcards!flashcards_fk_topic_owner(count)' as const;
const RANDOM_TOPIC_SYSTEM_KEY = 'random_topic';

export async function getCollectionOr404(args: {
  supabase: SupabaseClient;
  userId: string;
  collectionId: string;
}): Promise<{ id: string; system_key: string | null }> {
  const { data, error } = await args.supabase
    .from('collections')
    .select('id,system_key')
    .eq('id', args.collectionId)
    .eq('user_id', args.userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new TopicsServiceError(
      'collection_not_found',
      'Nie znaleziono kolekcji.'
    );
  }

  return data as { id: string; system_key: string | null };
}

export async function ensureRandomTopicForCollection(args: {
  supabase: SupabaseClient;
  userId: string;
  collectionId: string;
}): Promise<void> {
  const { data, error } = await args.supabase
    .from('topics')
    .select('id,collection_id')
    .eq('user_id', args.userId)
    .eq('system_key', RANDOM_TOPIC_SYSTEM_KEY)
    .maybeSingle();

  if (error) throw error;
  if (data?.id) {
    // W DB unikalność `system_key` jest per-user (partial unique index),
    // więc temat systemowy może istnieć tylko raz na użytkownika.
    // Jeśli z jakiegoś powodu jest przypięty do innej kolekcji, nie próbujemy
    // tego naprawiać (pola są immutable w MVP) — tylko logujemy i kończymy.
    if (data.collection_id !== args.collectionId) {
      console.error(
        '[ensureRandomTopicForCollection] random_topic in other collection',
        {
          userId: args.userId,
          expectedCollectionId: args.collectionId,
          actualCollectionId: data.collection_id,
        }
      );
    }
    return;
  }

  const { error: insertError } = await args.supabase.from('topics').insert({
    user_id: args.userId,
    collection_id: args.collectionId,
    name: 'Random',
    system_key: RANDOM_TOPIC_SYSTEM_KEY,
  });

  if (!insertError) return;
  if (isUniqueViolation(insertError)) return; // race condition (best-effort)
  throw insertError;
}

export async function listTopicsInCollection(
  args: {
    supabase: SupabaseClient;
    userId: string;
    collectionId: string;
  } & Required<Pick<TopicsListQuery, 'limit' | 'offset' | 'sort' | 'order'>> &
    Pick<TopicsListQuery, 'q'>
): Promise<{ items: TopicDto[]; total: number }> {
  const rangeTo = args.offset + args.limit - 1;

  let q = args.supabase
    .from('topics')
    .select(TOPIC_FIELDS_WITH_COUNTS, { count: 'exact' })
    .eq('user_id', args.userId)
    .eq('collection_id', args.collectionId);

  if (args.q) {
    q = q.ilike('name', `%${args.q}%`);
  }

  const { data, error, count } = await q
    .order(args.sort, { ascending: args.order === 'asc' })
    .range(args.offset, rangeTo);

  if (error) throw error;

  const items: TopicDto[] = (Array.isArray(data) ? data : []).map((row) => {
    const r = row as unknown as {
      id: string;
      name: string;
      description: string;
      system_key: string | null;
      created_at: string;
      updated_at: string;
      flashcards?: { count: number }[];
    };

    const flashcards_count =
      Array.isArray(r.flashcards) && typeof r.flashcards?.[0]?.count === 'number'
        ? r.flashcards[0].count
        : 0;

    return {
      id: r.id,
      name: r.name,
      description: r.description,
      system_key: r.system_key,
      created_at: r.created_at,
      updated_at: r.updated_at,
      flashcards_count,
    };
  });

  return {
    items,
    total: count ?? 0,
  };
}

export async function createTopicInCollection(args: {
  supabase: SupabaseClient;
  userId: string;
  collectionId: string;
  name: CreateTopicCommand['name'];
  description?: CreateTopicCommand['description'];
}): Promise<TopicDto> {
  const insertPayload = {
    user_id: args.userId,
    collection_id: args.collectionId,
    name: args.name,
    system_key: null,
    ...(args.description !== undefined
      ? { description: args.description }
      : {}),
  };

  const { data, error } = await args.supabase
    .from('topics')
    .insert(insertPayload)
    .select(TOPIC_FIELDS)
    .single();

  if (error) throw error;
  return data as TopicDto;
}

export async function updateTopicDescription(args: {
  supabase: SupabaseClient;
  userId: string;
  topicId: string;
  description: string;
}): Promise<TopicDto> {
  const { data: existing, error: existingError } = await args.supabase
    .from('topics')
    .select('id')
    .eq('id', args.topicId)
    .eq('user_id', args.userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing) {
    throw new TopicsServiceError('topic_not_found', 'Nie znaleziono tematu.');
  }

  const { data, error } = await args.supabase
    .from('topics')
    .update({ description: args.description })
    .eq('id', args.topicId)
    .eq('user_id', args.userId)
    .select(TOPIC_FIELDS)
    .single();

  if (error) throw error;
  return data as TopicDto;
}

export async function deleteTopic(args: {
  supabase: SupabaseClient;
  userId: string;
  topicId: string;
}): Promise<void> {
  const { data: existing, error: existingError } = await args.supabase
    .from('topics')
    .select('id,system_key')
    .eq('id', args.topicId)
    .eq('user_id', args.userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing) {
    throw new TopicsServiceError('topic_not_found', 'Nie znaleziono tematu.');
  }

  // W DB usuwanie tematów systemowych jest blokowane triggerem (old.system_key is not null).
  // Dla spójnego API mapujemy to na 403 po stronie aplikacji.
  if (existing.system_key) {
    throw new TopicsServiceError(
      'forbidden_system',
      'Nie można usunąć tematu systemowego.'
    );
  }

  const { error: deleteError } = await args.supabase
    .from('topics')
    .delete()
    .eq('id', args.topicId)
    .eq('user_id', args.userId);

  if (deleteError) throw deleteError;
}

export function isUniqueViolation(
  err: unknown
): err is PostgrestError & { code: '23505' } {
  const e = err as { code?: unknown };
  return e?.code === '23505';
}
