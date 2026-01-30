import { memo } from 'react';

import type { TopicsListProps } from '@/components/collection-topics/collection-topics.types';
import { TopicRow } from '@/components/collection-topics/TopicRow';

export const TopicsList = memo(function TopicsList(props: TopicsListProps) {
  return (
    <div className="mt-6 space-y-3">
      {props.items.map((item) => (
        <TopicRow
          key={item.id}
          item={item}
          onDeleteRequest={props.onDeleteRequest}
          collectionNameForContext={props.collectionNameForContext}
          collectionIdForContext={props.collectionIdForContext}
        />
      ))}
    </div>
  );
});

