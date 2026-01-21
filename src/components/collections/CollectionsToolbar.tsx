import * as React from 'react';

import { Button } from '@/components/ui/button';
import { CollectionsSearchInput } from '@/components/collections/CollectionsSearchInput';

export interface CollectionsToolbarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onQueryCommitNow?: () => void;
  onCreateClick: () => void;
  isBusy?: boolean;
}

export const CollectionsToolbar = React.memo(function CollectionsToolbar(
  props: CollectionsToolbarProps
) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <CollectionsSearchInput
        value={props.query}
        onValueChange={props.onQueryChange}
        onCommitNow={props.onQueryCommitNow}
        placeholder="Szukaj kolekcji po nazwie…"
      />

      <Button onClick={props.onCreateClick} disabled={props.isBusy}>
        Utwórz kolekcję
      </Button>
    </div>
  );
});

