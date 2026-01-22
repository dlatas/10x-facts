import type { FlashcardDto, FlashcardSource, TopicDto } from '@/types';

export interface TopicNavContext {
  topicNameFromUrl: string | null;
  fromCollectionId: string | null;
  fromCollectionName: string | null;
}

export interface TopicHeaderVm {
  id: string;
  name: string;
  description: string | null;
  systemKey: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardItemVm {
  id: string;
  front: string;
  back: string;
  source: FlashcardSource;
  isFavorite: boolean;
  editedByUser: boolean;
  createdAt: string;
  updatedAt: string;
}

export function mapTopicDtoToVm(dto: TopicDto): TopicHeaderVm {
  const systemKey = dto.system_key;
  const name = systemKey === 'random_topic' ? 'Temat Losowy' : dto.name;
  return {
    id: dto.id,
    name,
    description: dto.description ?? null,
    systemKey,
    isSystem: systemKey != null,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export function mapFlashcardDtoToVm(dto: FlashcardDto): FlashcardItemVm {
  return {
    id: dto.id,
    front: dto.front,
    back: dto.back,
    source: dto.source as FlashcardSource,
    isFavorite: dto.is_favorite,
    editedByUser: dto.edited_by_user,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}
