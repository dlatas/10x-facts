import * as React from 'react';
import { X } from 'lucide-react';

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
    <Card className="relative cursor-pointer transition-colors hover:bg-accent/30">
      <a
        href={detailsUrl}
        aria-label={`Otwórz temat: ${props.item.name}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <CardContent className="pointer-events-none relative z-10 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{props.item.name}</p>
            <span
              className="inline-flex size-6 items-center justify-center rounded-full border bg-background text-xs font-semibold text-muted-foreground"
              title={`Liczba fiszek: ${props.item.flashcardsCount}`}
              aria-label={`Liczba fiszek: ${props.item.flashcardsCount}`}
            >
              {props.item.flashcardsCount}
            </span>
            {props.item.systemKey ? <SystemBadge systemKey={props.item.systemKey} /> : null}
          </div>
        </div>

        <div className="pointer-events-auto relative z-20 flex flex-wrap items-center gap-2">
          {props.onDeleteRequest ? (
            canDelete ? (
              <Button
                variant="outline"
                size="icon"
                aria-label="Usuń temat"
                title="Usuń temat"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onDeleteRequest?.(props.item);
                }}
              >
                <X />
              </Button>
            ) : (
              <span
                title="Nie można usunąć — to temat systemowy."
                className="cursor-not-allowed"
              >
                <Button variant="outline" size="icon" disabled aria-label="Usuń (niedostępne)">
                  <X />
                </Button>
              </span>
            )
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
});

