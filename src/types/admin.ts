import type { AiGenerationEvent, Flashcard } from '@/types/entities';

type CountOf<TEntity> = number & { __countOf?: TEntity };

export interface AdminMetricsSummaryResponseDto {
  accept_rate: number;
  ai_share: number;
  accepted: CountOf<AiGenerationEvent>;
  rejected: CountOf<AiGenerationEvent>;
  auto_generated: CountOf<Flashcard>;
  manually_created: CountOf<Flashcard>;
}

export interface AdminMetricsDailyQuery {
  from: string;
  to: string;
}

export interface AdminMetricsDailyItemDto {
  day_utc: string;
  accepted: CountOf<AiGenerationEvent>;
  rejected: CountOf<AiGenerationEvent>;
  auto_generated: CountOf<Flashcard>;
  manually_created: CountOf<Flashcard>;
}

export interface AdminMetricsDailyResponseDto {
  items: AdminMetricsDailyItemDto[];
}
