import type { CollectionDto } from "@/types";
import { Button } from "@/components/ui/button";
import { CreateCollectionInline } from "@/components/dashboard/CreateCollectionInline";
import { SystemBadge } from "@/components/collections/SystemBadge";

const RANDOM_SYSTEM_KEY = "random_collection";
const RANDOM_COLLECTION_LABEL = "Kolekcja Losowa";

function CollectionItem(props: { collection: CollectionDto }) {
  const isRandom = props.collection.system_key === RANDOM_SYSTEM_KEY;
  const systemKey = props.collection.system_key;
  const isSystem = systemKey != null;
  const displayName = isRandom ? RANDOM_COLLECTION_LABEL : props.collection.name;
  const href = `/collections/${encodeURIComponent(props.collection.id)}/topics?collectionName=${encodeURIComponent(displayName)}`;

  return (
    <li className="rounded-md">
      <a
        href={href}
        className="flex items-center gap-2 truncate rounded-md py-1 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      >
        <span className="truncate">
          {displayName}
        </span>
        {isSystem ? <SystemBadge systemKey={systemKey} /> : null}
      </a>
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
    <aside className="w-full p-4 md:w-72 md:pr-0">
      <div className="rounded-2xl border bg-muted/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Kolekcje</h2>
        <Button variant="outline" size="sm" asChild>
          <a href="/collections" aria-label="Wszystkie kolekcje">
            Wszystkie
          </a>
        </Button>
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

      <div className="mt-3">
        <CreateCollectionInline
          onCreate={props.onCollectionCreate}
          isLoading={props.isCreatingCollection ?? false}
        />
      </div>
      </div>
    </aside>
  );
}
