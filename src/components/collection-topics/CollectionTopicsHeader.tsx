import { memo } from 'react';

import type { CollectionTopicsHeaderProps } from '@/components/collection-topics/collection-topics.types';
import { Button } from '@/components/ui/button';

export const CollectionTopicsHeader = memo(function CollectionTopicsHeader(
  props: CollectionTopicsHeaderProps
) {
  return (
    <div className="space-y-3">
      <Button asChild variant="outline" size="sm" className="w-fit">
        <a href="/collections">Wróć do kolekcji</a>
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">
            Tematy
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kolekcja:{' '}
            {props.collectionName ? (
              <span className="font-medium text-foreground">
                {props.collectionName}
              </span>
            ) : (
              <span className="font-mono">{props.collectionId}</span>
            )}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Lista tematów w wybranej kolekcji. Możesz wyszukać temat po nazwie lub
            utworzyć nowy.
          </p>
        </div>
      </div>
    </div>
  );
});

