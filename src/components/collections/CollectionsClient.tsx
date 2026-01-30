import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useCollectionsView } from '@/components/hooks/useCollectionsView';
import { CollectionsToolbar } from '@/components/collections/CollectionsToolbar';
import { CollectionsList } from '@/components/collections/CollectionsList';
import { CollectionsListState } from '@/components/collections/CollectionsListState';
import { CreateCollectionDialog } from '@/components/collections/CreateCollectionDialog';
import { DeleteCollectionConfirmDialog } from '@/components/collections/DeleteCollectionConfirmDialog';
import { toast } from 'sonner';

export function CollectionsClient() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <CollectionsClientInner />
    </QueryClientProvider>
  );
}

function CollectionsClientInner() {
  const view = useCollectionsView();

  const isBusy = view.isCreating || view.isDeleting;
  const isEmpty = view.status === 'ready' && view.items.length === 0;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const reason = url.searchParams.get('reason');
    if (!reason) return;

    if (reason === 'collection_not_found') {
      toast.error('Nie znaleziono kolekcji.');
    } else {
      toast.error('Nie udało się wykonać akcji.');
    }

    url.searchParams.delete('reason');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  return (
    <main className="p-4 md:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Kolekcje</h1>
      </div>

      <CollectionsToolbar
        query={view.queryDraft}
        onQueryChange={view.setQueryDraft}
        onQueryCommitNow={view.commitQueryNow}
        onCreateClick={() => view.setCreateDialogOpen(true)}
        isBusy={isBusy}
      />

      <CollectionsListState
        status={view.status}
        isEmpty={isEmpty}
        errorMessage={view.errorMessage}
        onRetry={view.retry}
        onClearFilter={view.queryDraft ? () => view.setQueryDraft('') : undefined}
      />

      {view.status === 'ready' && !isEmpty ? (
        <CollectionsList items={view.items} onDeleteRequest={view.requestDelete} />
      ) : null}

      <CreateCollectionDialog
        open={view.createDialogOpen}
        onOpenChange={view.setCreateDialogOpen}
        onSubmit={view.submitCreate}
        isSubmitting={view.isCreating}
        errorMessage={view.createError}
      />

      <DeleteCollectionConfirmDialog
        open={view.deleteDialogOpen}
        collectionName={view.deleteTarget?.name ?? null}
        onConfirm={view.confirmDelete}
        onOpenChange={view.setDeleteDialogOpen}
        isDeleting={view.isDeleting}
      />
    </main>
  );
}

