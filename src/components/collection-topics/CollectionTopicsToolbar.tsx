import * as React from 'react';

import type { CollectionTopicsToolbarProps } from '@/components/collection-topics/collection-topics.types';
import { TopicsSearchInput } from '@/components/collection-topics/TopicsSearchInput';
import { Button } from '@/components/ui/button';

export const CollectionTopicsToolbar = React.memo(function CollectionTopicsToolbar(
  props: CollectionTopicsToolbarProps
) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <TopicsSearchInput
        value={props.query}
        onValueChange={props.onQueryChange}
        onCommitNow={props.onQueryCommitNow}
        disabled={props.isBusy}
        placeholder="Szukaj tematu po nazwie…"
      />

      <Button type="button" onClick={props.onCreateClick} disabled={props.isBusy}>
        Utwórz temat
      </Button>
    </div>
  );
});

