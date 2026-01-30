import { memo } from 'react';
import { X } from 'lucide-react';

import type { CollectionsListItemVm } from '@/components/hooks/useCollectionsView';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SystemBadge } from '@/components/collections/SystemBadge';

export interface CollectionRowProps {
  item: CollectionsListItemVm;
  onDeleteRequest: (item: CollectionsListItemVm) => void;
}

export const CollectionRow = memo(function CollectionRow(props: CollectionRowProps) {
  const canDelete = !props.item.isSystem;
  const topicsHref = `/collections/${encodeURIComponent(props.item.id)}/topics?collectionName=${encodeURIComponent(props.item.name)}`;

  return (
    <Card className="relative cursor-pointer transition-colors hover:bg-accent/30">
      <a
        href={topicsHref}
        aria-label={`Otwórz kolekcję: ${props.item.name}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <CardContent className="pointer-events-none relative z-10 flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium leading-snug break-words whitespace-normal">
              {props.item.name}
            </p>
            <span
              className="inline-flex size-6 items-center justify-center rounded-full border bg-background text-xs font-semibold text-muted-foreground"
              title={`Liczba tematów: ${props.item.topicsCount}`}
              aria-label={`Liczba tematów: ${props.item.topicsCount}`}
            >
              {props.item.topicsCount}
            </span>
            {props.item.systemKey ? <SystemBadge systemKey={props.item.systemKey} /> : null}
          </div>
        </div>

        <div className="pointer-events-auto relative z-20 flex shrink-0 items-center gap-2">
          {canDelete ? (
            <Button
              variant="outline"
              size="icon"
              aria-label="Usuń kolekcję"
              title="Usuń kolekcję"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onDeleteRequest(props.item);
              }}
            >
              <X />
            </Button>
          ) : (
            <span
              title="Nie można usunąć — to kolekcja systemowa."
              className="cursor-not-allowed"
            >
              <Button variant="outline" size="icon" disabled aria-label="Usuń (niedostępne)">
                <X />
              </Button>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

