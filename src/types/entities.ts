import type { Tables } from '@/db/database.types';

export type Profile = Tables<'profiles'>;
export type Collection = Tables<'collections'>;
export type Topic = Tables<'topics'>;
export type Flashcard = Tables<'flashcards'>;
export type AiGenerationEvent = Tables<'ai_generation_events'>;
