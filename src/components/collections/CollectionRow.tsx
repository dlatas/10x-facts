import * as React from 'react';

import type { CollectionsListItemVm } from '@/components/hooks/useCollectionsView';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SystemBadge } from '@/components/collections/SystemBadge';

export interface CollectionRowProps {
  item: CollectionsListItemVm;
  onDeleteRequest: (item: CollectionsListItemVm) => void;
}

export const CollectionRow = React.memo(function CollectionRow(props: CollectionRowProps) {
  const canDelete = !props.item.isSystem;
  const topicsHref = `/collections/${encodeURIComponent(props.item.id)}/topics?collectionName=${encodeURIComponent(props.item.name)}`;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{props.item.name}</p>
            {props.item.systemKey ? <SystemBadge systemKey={props.item.systemKey} /> : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <a href={topicsHref}>Tematy</a>
          </Button>

          {canDelete ? (
            <Button
              variant="destructive"
              onClick={() => props.onDeleteRequest(props.item)}
            >
              Usuń
            </Button>
          ) : (
            <span
              title="Nie można usunąć — to kolekcja systemowa."
              className="cursor-not-allowed"
            >
              <Button variant="destructive" disabled>
                Usuń
              </Button>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

