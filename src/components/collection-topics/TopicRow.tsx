import * as React from 'react';

import type { TopicRowProps } from '@/components/collection-topics/collection-topics.types';
import { SystemBadge } from '@/components/collections/SystemBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const TopicRow = React.memo(function TopicRow(props: TopicRowProps) {
  const canDelete = !props.item.isSystem;

  const detailsUrl = React.useMemo(() => {
    const url = new URL(`/topics/${encodeURIComponent(props.item.id)}`, 'http://local');
    if (props.collectionIdForContext) {
      url.searchParams.set('fromCollectionId', props.collectionIdForContext);
    }
    if (props.collectionNameForContext) {
      url.searchParams.set('fromCollectionName', props.collectionNameForContext);
    }
    // Szybki fallback na nazwę w nagłówku, zanim dojdą dane z API.
    url.searchParams.set('topicName', props.item.name);
    return `${url.pathname}${url.search}`;
  }, [props.collectionIdForContext, props.collectionNameForContext, props.item.id, props.item.name]);

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
            <a href={detailsUrl}>Szczegóły</a>
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

