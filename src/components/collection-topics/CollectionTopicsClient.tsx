import * as React from 'react';

import { useCollectionTopicsData } from '@/components/hooks/useCollectionTopicsData';
import type { TopicsListItemVm } from '@/components/collection-topics/collection-topics.types';
import { CollectionTopicsHeader } from '@/components/collection-topics/CollectionTopicsHeader';
import { CollectionTopicsToolbar } from '@/components/collection-topics/CollectionTopicsToolbar';
import { CreateTopicDialog } from '@/components/collection-topics/CreateTopicDialog';
import { DeleteTopicConfirmDialog } from '@/components/collection-topics/DeleteTopicConfirmDialog';
import { TopicsList } from '@/components/collection-topics/TopicsList';
import { TopicsListState } from '@/components/collection-topics/TopicsListState';
import { toast } from 'sonner';

export function CollectionTopicsClient(props: { collectionId: string }) {
  const { collectionId } = props;

  const view = useCollectionTopicsData({ collectionId });

  // UI state (dialogi)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<TopicsListItemVm | null>(null);

  const isBusy = view.isCreating || view.isDeleting;
  const isEmpty = view.status === 'ready' && view.items.length === 0;

  const itemsVm = React.useMemo<TopicsListItemVm[]>(() => {
    return view.items.map((dto) => {
      const systemKey = dto.system_key;
      return {
        id: dto.id,
        name: systemKey === 'random_topic' ? 'Temat Losowy' : dto.name,
        description: dto.description ?? null,
        systemKey,
        isSystem: systemKey != null,
        createdAt: dto.created_at,
        updatedAt: dto.updated_at,
      };
    });
  }, [view.items]);

  const isRandomCollection = React.useMemo(() => {
    // Prefer pewny sygnał: obecność tematu systemowego random_topic w tej kolekcji.
    if (itemsVm.some((t) => t.systemKey === 'random_topic')) return true;

    // Fallback: heurystyka po nazwie przekazanej w nawigacji.
    const n = (view.collectionName ?? '').trim().toLowerCase();
    return n === 'random' || n === 'kolekcja losowa';
  }, [itemsVm, view.collectionName]);

  const visibleItems = React.useMemo(() => {
    if (!isRandomCollection) return itemsVm;
    return itemsVm.filter((t) => t.systemKey === 'random_topic');
  }, [isRandomCollection, itemsVm]);

  React.useEffect(() => {
    if (!isRandomCollection) return;
    if (createDialogOpen) setCreateDialogOpen(false);
  }, [createDialogOpen, isRandomCollection]);

  const requestDelete = React.useCallback((item: TopicsListItemVm) => {
    if (item.isSystem) return;
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget) return;
    const res = await view.submitDelete({
      id: deleteTarget.id,
      system_key: deleteTarget.systemKey,
    });
    if (!res.ok) {
      if (res.errorMessage) toast.error(res.errorMessage);
      return;
    }
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    toast.success('Usunięto temat.');
  }, [deleteTarget, view]);

  const submitCreate = React.useCallback(
    async (name: string) => {
      const created = await view.submitCreate(name);
      if (!created) return;
      setCreateDialogOpen(false);
      toast.success('Utworzono temat.');
    },
    [view]
  );

  return (
    <main className="p-4 md:p-8">
      <CollectionTopicsHeader
        collectionId={collectionId}
        collectionName={view.collectionName}
      />

      <CollectionTopicsToolbar
        query={view.queryDraft}
        onQueryChange={view.setQueryDraft}
        onQueryCommitNow={view.commitQueryNow}
        onCreateClick={() => {
          if (isRandomCollection) return;
          setCreateDialogOpen(true);
        }}
        canCreate={!isRandomCollection}
        isBusy={isBusy}
      />

      <TopicsListState
        status={view.status}
        isEmpty={isEmpty}
        errorMessage={view.errorMessage}
        onRetry={view.retry}
        onClearFilter={view.queryDraft ? () => view.setQueryDraft('') : undefined}
      />

      {view.status === 'ready' && !isEmpty ? (
        <TopicsList
          items={visibleItems}
          onDeleteRequest={requestDelete}
          collectionNameForContext={view.collectionName}
          collectionIdForContext={collectionId}
        />
      ) : null}

      {!isRandomCollection ? (
        <CreateTopicDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={submitCreate}
          isSubmitting={view.isCreating}
          errorMessage={view.createError}
        />
      ) : null}

      <DeleteTopicConfirmDialog
        open={deleteDialogOpen}
        topicName={deleteTarget?.name ?? null}
        onConfirm={confirmDelete}
        onOpenChange={setDeleteDialogOpen}
        isDeleting={view.isDeleting}
      />
    </main>
  );
}

