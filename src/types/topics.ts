import type { TablesInsert, TablesUpdate } from '@/db/database.types';
import type { ListResponse, OkResponse, SortOrder } from '@/types/common';
import type { Topic } from '@/types/entities';

export type TopicDto = Pick<
  Topic,
  'id' | 'name' | 'description' | 'system_key' | 'created_at' | 'updated_at'
> & {
  flashcards_count?: number;
};

export interface TopicsListQuery {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: keyof TopicDto;
  order?: SortOrder;
}

export type TopicsListResponseDto = ListResponse<TopicDto>;
export type CreateTopicCommand = Pick<
  TablesInsert<'topics'>,
  'name' | 'description'
>;
export type UpdateTopicDescriptionCommand = Required<
  Pick<TablesUpdate<'topics'>, 'description'>
>;
export type CreateTopicResponseDto = TopicDto;
export type UpdateTopicResponseDto = TopicDto;
export type DeleteTopicResponseDto = OkResponse;
