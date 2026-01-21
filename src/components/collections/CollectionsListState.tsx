import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface CollectionsListStateProps {
  status: 'loading' | 'error' | 'ready';
  isEmpty: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  onClearFilter?: () => void;
}

export const CollectionsListState = React.memo(function CollectionsListState(
  props: CollectionsListStateProps
) {
  if (props.status === 'loading') {
    return (
      <div className="mt-6 space-y-3" aria-busy="true" aria-live="polite">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-8 w-56 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (props.status === 'error') {
    return (
      <Card className="mt-6">
        <CardContent className="p-6">
          <p className="text-sm font-medium">Nie udało się załadować kolekcji</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {props.errorMessage ?? 'Spróbuj ponownie.'}
          </p>
          <Button className="mt-4" onClick={props.onRetry}>
            Spróbuj ponownie
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (props.isEmpty) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6">
          <p className="text-sm font-medium">Brak kolekcji</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Brak kolekcji spełniających kryteria wyszukiwania.
          </p>
          {props.onClearFilter ? (
            <Button className="mt-4" variant="outline" onClick={props.onClearFilter}>
              Wyczyść filtr
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return null;
});

