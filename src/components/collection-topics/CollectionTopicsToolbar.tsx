import { memo } from 'react';

import type { CollectionTopicsToolbarProps } from '@/components/collection-topics/collection-topics.types';
import { TopicsSearchInput } from '@/components/collection-topics/TopicsSearchInput';
import { Button } from '@/components/ui/button';

export const CollectionTopicsToolbar = memo(function CollectionTopicsToolbar(
  props: CollectionTopicsToolbarProps
) {
  const canCreate = props.canCreate ?? true;

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <TopicsSearchInput
        value={props.query}
        onValueChange={props.onQueryChange}
        onCommitNow={props.onQueryCommitNow}
        disabled={props.isBusy}
        placeholder="Szukaj tematu po nazwie…"
      />

      <Button
        type="button"
        onClick={props.onCreateClick}
        disabled={props.isBusy || !canCreate}
        title={
          !canCreate
            ? 'W kolekcji losowej dostępny jest tylko temat losowy.'
            : undefined
        }
      >
        Utwórz temat
      </Button>
    </div>
  );
});

