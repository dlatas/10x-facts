import * as React from 'react';

import type { TopicRowProps } from '@/components/collection-topics/collection-topics.types';
import { SystemBadge } from '@/components/collections/SystemBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const TopicRow = React.memo(function TopicRow(props: TopicRowProps) {
  const canDelete = !props.item.isSystem;

  const descriptionHrefBase = `/topics/${encodeURIComponent(props.item.id)}`;
  const descriptionHref = props.collectionNameForContext
    ? `${descriptionHrefBase}?fromCollectionName=${encodeURIComponent(props.collectionNameForContext)}`
    : descriptionHrefBase;

  const flashcardsHrefBase = `/topics/${encodeURIComponent(props.item.id)}/flashcards`;
  const flashcardsHref = props.collectionNameForContext
    ? `${flashcardsHrefBase}?fromCollectionName=${encodeURIComponent(props.collectionNameForContext)}`
    : flashcardsHrefBase;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{props.item.name}</p>
            {props.item.systemKey ? <SystemBadge systemKey={props.item.systemKey} /> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <a href={descriptionHref}>Opis tematu</a>
          </Button>
          <Button asChild variant="outline">
            <a href={flashcardsHref}>Fiszki</a>
          </Button>

          {props.onDeleteRequest ? (
            canDelete ? (
              <Button
                variant="destructive"
                onClick={() => props.onDeleteRequest?.(props.item)}
              >
                Usuń
              </Button>
            ) : (
              <span
                title="Nie można usunąć — to temat systemowy."
                className="cursor-not-allowed"
              >
                <Button variant="destructive" disabled>
                  Usuń
                </Button>
              </span>
            )
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
});

