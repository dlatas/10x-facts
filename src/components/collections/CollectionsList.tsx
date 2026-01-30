import { memo } from 'react';

import type { CollectionsListItemVm } from '@/components/hooks/useCollectionsView';
import { CollectionRow } from '@/components/collections/CollectionRow';

export interface CollectionsListProps {
  items: CollectionsListItemVm[];
  onDeleteRequest: (item: CollectionsListItemVm) => void;
}

export const CollectionsList = memo(function CollectionsList(
  props: CollectionsListProps
) {
  return (
    <div className="mt-6 space-y-3">
      {props.items.map((item) => (
        <CollectionRow key={item.id} item={item} onDeleteRequest={props.onDeleteRequest} />
      ))}
    </div>
  );
});

