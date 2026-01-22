import type { AiGenerationEvent, Flashcard, Topic } from '@/types/entities';

// API exposes these enums; intersect with DB string fields for consistency.
export type AiGenerationStatus = AiGenerationEvent['status'] &
  ('accepted' | 'rejected' | 'skipped' | 'failed');

// AI generation
export interface AiGenerateCommand {
  topic_id: Topic['id'];
}

export interface AiGenerateTopicDescriptionCommand {
  topic_id: Topic['id'];
}

export interface AiGenerateTopicDescriptionResponseDto {
  description: Topic['description'];
}

export type AiGenerationProposalDto = Pick<Flashcard, 'front' | 'back'>;

export interface AiGenerationLimitDto {
  remaining: number;
  reset_at_utc: string;
}

export interface AiGenerateResponseDto {
  proposal: AiGenerationProposalDto;
  limit: AiGenerationLimitDto;
  is_random: AiGenerationEvent['is_random'];
  /**
   * Tylko dla tematu losowego: identyfikator wylosowanej domeny/tematu (telemetria).
   * Dla normalnych tematów: null.
   */
  random_domain_label?: AiGenerationEvent['random_domain_label'];
}

export interface AiAcceptCommand {
  topic_id: Topic['id'];
  front: Flashcard['front'];
  back: Flashcard['back'];
  is_random: AiGenerationEvent['is_random'];
  random_domain_label: AiGenerationEvent['random_domain_label'];
}

export interface AiAcceptResponseDto {
  flashcard_id: Flashcard['id'];
  event_id: AiGenerationEvent['id'];
}

export interface AiRejectCommand {
  topic_id: Topic['id'];
  is_random: AiGenerationEvent['is_random'];
  random_domain_label: AiGenerationEvent['random_domain_label'];
}

export interface AiRejectResponseDto {
  event_id: AiGenerationEvent['id'];
}

export type AiSkipCommand = AiRejectCommand;

export interface AiSkipResponseDto {
  event_id: AiGenerationEvent['id'];
}
