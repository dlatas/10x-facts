import * as React from "react";

import type { CollectionDto } from "@/types";
import { Button } from "@/components/ui/button";
import { CreateCollectionInline } from "@/components/dashboard/CreateCollectionInline";

function CollectionItem(props: { collection: CollectionDto }) {
  return (
    <li className="truncate rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground">
      {props.collection.name}
    </li>
  );
}

function CollectionList(props: { collections: CollectionDto[] }) {
  return (
    <ul className="space-y-1">
      {props.collections.map((c) => (
        <CollectionItem key={c.id} collection={c} />
      ))}
    </ul>
  );
}

export function DashboardSidebar(props: {
  collections: CollectionDto[];
  onCollectionCreate: (name: string) => Promise<void>;
  isLoading: boolean;
  isCreatingCollection?: boolean;
}) {
  return (
    <aside className="w-full border-b p-4 md:w-72 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Kolekcje</h2>
        <Button variant="ghost" size="sm" asChild>
          <a href="/collections" aria-label="Wszystkie kolekcje">
            Wszystkie
          </a>
        </Button>
      </div>

      <div className="mt-3">
        <CreateCollectionInline onCreate={props.onCollectionCreate} isLoading={props.isCreatingCollection ?? false} />
      </div>

      <div className="mt-4">
        {props.isLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <CollectionList collections={props.collections} />
        )}
      </div>
    </aside>
  );
}
