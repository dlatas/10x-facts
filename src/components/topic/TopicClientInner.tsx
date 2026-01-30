import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Heart, Pencil, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

import type {
  CreateFlashcardCommand,
  FlashcardsListQuery,
  UpdateFlashcardCommand,
} from '@/types';
import { fetchJson } from '@/lib/http/fetch-json';
import { redirectToLogin } from '@/lib/http/redirect';
import { HttpError } from '@/lib/http/http-error';
import { createCollectionTopicsViewService, HttpError as TopicsHttpError } from '@/lib/services/collection-topics-view.service';
import { createTopicFlashcardsViewService, HttpError as FlashcardsHttpError } from '@/lib/services/topic-flashcards-view.service';
import { createAiViewService, HttpError as AiHttpError } from '@/lib/services/ai-view.service';
import { fireConfetti } from '../../lib/confetti';
import { useTopicUrlState } from './useTopicUrlState';
import { mapFlashcardDtoToVm, mapTopicDtoToVm } from './topic.types';
import type { FlashcardItemVm, TopicHeaderVm } from './topic.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { clampTrimmed } from '@/lib/utils';
import { createFlashcardCommandSchema } from '@/lib/validation/flashcards.schemas';
import { updateTopicDescriptionCommandSchema } from '@/lib/validation/topics.schemas';
import { FlashcardPreviewDialog } from '@/components/topic/modals/FlashcardPreviewDialog';
import { DeleteFlashcardConfirmDialog } from '@/components/topic/modals/DeleteFlashcardConfirmDialog';
import { TopicDescriptionDialog } from '@/components/topic/modals/TopicDescriptionDialog';
import { CreateFlashcardDialog } from '@/components/topic/modals/CreateFlashcardDialog';
import { EditFlashcardDialog } from '@/components/topic/modals/EditFlashcardDialog';
import { AiProposalDialog } from '@/components/topic/modals/AiProposalDialog';
import { Input } from '@/components/ui/input';

const TOPIC_QUERY_KEY = ['topic'] as const;
const FLASHCARDS_QUERY_KEY = ['flashcards'] as const;

function redirectToCollections(reason?: string): void {
  if (typeof window === 'undefined') return;
  const url = reason ? `/collections?reason=${encodeURIComponent(reason)}` : '/collections';
  window.location.assign(url);
}

export function TopicClientInner(props: { topicId: string }) {
  const queryClient = useQueryClient();

  const url = useTopicUrlState({ debounceMs: 300 });

  const topicsService = useMemo(() => createCollectionTopicsViewService(), []);
  const flashcardsService = useMemo(() => createTopicFlashcardsViewService(), []);
  const aiService = useMemo(() => createAiViewService(), []);

  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [descriptionStatus, setDescriptionStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const descriptionForm = useForm<z.infer<typeof updateTopicDescriptionCommandSchema>>({
    resolver: zodResolver(updateTopicDescriptionCommandSchema),
    defaultValues: { description: '' },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const createForm = useForm<z.infer<typeof createFlashcardCommandSchema>>({
    resolver: zodResolver(createFlashcardCommandSchema),
    defaultValues: { front: '', back: '' },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FlashcardItemVm | null>(null);
  const editForm = useForm<z.infer<typeof createFlashcardCommandSchema>>({
    resolver: zodResolver(createFlashcardCommandSchema),
    defaultValues: { front: '', back: '' },
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FlashcardItemVm | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<FlashcardItemVm | null>(null);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiProposal, setAiProposal] = useState<{ front: string; back: string } | null>(
    null
  );
  const [aiIsRandom, setAiIsRandom] = useState(false);
  const [aiRandomDomainLabel, setAiRandomDomainLabel] = useState<string | null>(null);
  const [aiLimit, setAiLimit] = useState<{ remaining: number; reset_at_utc: string } | null>(
    null
  );

  const topicQuery = useQuery({
    queryKey: [
      ...TOPIC_QUERY_KEY,
      {
        topicId: props.topicId,
        fromCollectionId: url.context.fromCollectionId,
      },
    ],
    queryFn: async (): Promise<TopicHeaderVm | null> => {
      const fallbackName = url.context.topicNameFromUrl ?? 'Temat';

      if (!url.context.fromCollectionId) {
        return {
          id: props.topicId,
          name: fallbackName,
          description: null,
          systemKey: null,
          isSystem: false,
          createdAt: '',
          updatedAt: '',
        };
      }

      const json = await topicsService.getTopicsInCollection(url.context.fromCollectionId, {
        limit: 100,
        offset: 0,
        sort: 'created_at',
        order: 'desc',
      });
      const found = (json.items ?? []).find((t) => t.id === props.topicId);
      if (!found) {
        throw new TopicsHttpError(404, 'Nie znaleziono tematu w kolekcji.');
      }
      return mapTopicDtoToVm(found);
    },
    retry: false,
  });

  useEffect(() => {
    if (!topicQuery.data) return;
    const raw = topicQuery.data.description ?? '';
    const cleaned =
      raw.trim().toLowerCase() === 'example description.' ? '' : raw;
    descriptionForm.reset({ description: cleaned });
    descriptionForm.clearErrors();
    if (descriptionStatus !== 'idle') setDescriptionStatus('idle');
  }, [descriptionForm, descriptionStatus, topicQuery.data]);

  const flashcardsQuery = useQuery({
    queryKey: [
      ...FLASHCARDS_QUERY_KEY,
      {
        topicId: props.topicId,
        q: url.qCommitted,
      },
    ],
    queryFn: async () => {
      const query: FlashcardsListQuery = {
        q: url.qCommitted.trim() ? url.qCommitted.trim() : undefined,
        limit: 50,
        offset: 0,
        sort: 'created_at',
        order: 'desc',
      };
      return await flashcardsService.list(props.topicId, query);
    },
    retry: false,
  });

  const items = useMemo(() => {
    const dto = flashcardsQuery.data?.items ?? [];
    return dto.map(mapFlashcardDtoToVm);
  }, [flashcardsQuery.data?.items]);

  const saveDescriptionMutation = useMutation({
    mutationFn: async () => {
      const description = descriptionForm.getValues('description');
      await fetchJson<unknown>({
        url: `/api/v1/topics/${encodeURIComponent(props.topicId)}`,
        method: 'PATCH',
        body: { description },
      });
    },
    onMutate: () => {
      setDescriptionStatus('saving');
    },
    onSuccess: () => {
      setDescriptionStatus('saved');
      toast.success('Zapisano opis tematu.');
      void queryClient.invalidateQueries({ queryKey: TOPIC_QUERY_KEY });
    },
    onError: (e) => {
      if (e instanceof HttpError) {
        if (e.status === 401) return redirectToLogin();
        if (e.status === 404) return redirectToCollections('topic_not_found');
        const msg = e.message || 'Nie udało się zapisać opisu.';
        setDescriptionStatus('error');
        descriptionForm.setError('root', { message: msg });
        toast.error(msg);
        return;
      }

      const msg =
        e instanceof Error ? e.message : 'Nie udało się zapisać opisu.';
      setDescriptionStatus('error');
      descriptionForm.setError('root', { message: msg });
      toast.error(msg);
    },
  });

  const generateDescriptionMutation = useMutation({
    mutationFn: async () => {
      return await aiService.generateTopicDescription({ topic_id: props.topicId });
    },
    onSuccess: (res) => {
      descriptionForm.setValue('description', res.description ?? '', {
        shouldDirty: true,
      });
      descriptionForm.clearErrors();
      if (descriptionStatus !== 'idle') setDescriptionStatus('idle');
      toast.success('Wygenerowano opis tematu. Możesz go jeszcze edytować i zapisać.');
    },
    onError: (e) => {
      if (e instanceof AiHttpError) {
        if (e.status === 401) return redirectToLogin();
        if (e.status === 404) return redirectToCollections('topic_not_found');
        toast.error(e.message || 'Nie udało się wygenerować opisu.');
        return;
      }
      toast.error(e instanceof Error ? e.message : 'Nie udało się wygenerować opisu.');
    },
  });

  const createFlashcardMutation = useMutation({
    mutationFn: async (cmd: CreateFlashcardCommand) => {
      return await flashcardsService.create(props.topicId, cmd);
    },
    onSuccess: async () => {
      setCreateOpen(false);
      createForm.reset({ front: '', back: '' });
      createForm.clearErrors();
      toast.success('Dodano fiszkę.');
      await queryClient.invalidateQueries({ queryKey: FLASHCARDS_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: FLASHCARDS_QUERY_KEY });
    },
    onError: (e) => {
      if (e instanceof FlashcardsHttpError) {
        if (e.status === 401) return redirectToLogin();
        if (e.status === 404) return redirectToCollections('topic_not_found');
        createForm.setError('root', {
          message: e.message || 'Nie udało się dodać fiszki.',
        });
        return;
      }
      createForm.setError('root', {
        message:
          e instanceof Error ? e.message : 'Nie udało się dodać fiszki.',
      });
    },
  });

  const updateFlashcardMutation = useMutation({
    mutationFn: async (args: { id: string; command: UpdateFlashcardCommand }) => {
      return await flashcardsService.update(args.id, args.command);
    },
    onSuccess: async () => {
      setEditOpen(false);
      setEditTarget(null);
      editForm.reset({ front: '', back: '' });
      editForm.clearErrors();
      toast.success('Zapisano zmiany fiszki.');
      await queryClient.invalidateQueries({ queryKey: FLASHCARDS_QUERY_KEY });
    },
    onError: (e) => {
      if (e instanceof FlashcardsHttpError) {
        if (e.status === 401) return redirectToLogin();
        editForm.setError('root', {
          message: e.message || 'Nie udało się zapisać fiszki.',
        });
        return;
      }
      editForm.setError('root', {
        message:
          e instanceof Error ? e.message : 'Nie udało się zapisać fiszki.',
      });
    },
  });

  const deleteFlashcardMutation = useMutation({
    mutationFn: async (id: string) => {
      return await flashcardsService.delete(id);
    },
    onSuccess: async () => {
      setDeleteOpen(false);
      setDeleteTarget(null);
      toast.success('Usunięto fiszkę.');
      await queryClient.invalidateQueries({ queryKey: FLASHCARDS_QUERY_KEY });
    },
    onError: (e) => {
      if (e instanceof FlashcardsHttpError) {
        if (e.status === 401) return redirectToLogin();
        toast.error(e.message || 'Nie udało się usunąć fiszki.');
        return;
      }
      toast.error(e instanceof Error ? e.message : 'Nie udało się usunąć fiszki.');
    },
  });

  const aiGenerateMutation = useMutation({
    mutationFn: async () => {
      return await aiService.generate({ topic_id: props.topicId });
    },
    onSuccess: (res) => {
      setAiLimit(res.limit);
      setAiIsRandom(Boolean(res.is_random));
      setAiRandomDomainLabel(res.random_domain_label ?? null);
      setAiProposal(res.proposal);
      setAiOpen(true);

      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            void fireConfetti();
          });
        });
      }
    },
    onError: (e) => {
      if (e instanceof AiHttpError) {
        if (e.status === 401) return redirectToLogin();
        if (e.status === 404) return redirectToCollections('topic_not_found');
        if (e.status === 429) {
          toast.error(e.message || 'Limit AI został wyczerpany.');
          return;
        }
        toast.error(e.message || 'Nie udało się wygenerować fiszki.');
        return;
      }
      toast.error(e instanceof Error ? e.message : 'Nie udało się wygenerować fiszki.');
    },
  });

  const aiAcceptMutation = useMutation({
    mutationFn: async (args: { front: string; back: string }) => {
      const payload = {
        topic_id: props.topicId,
        front: args.front,
        back: args.back,
        is_random: aiIsRandom,
        random_domain_label: aiIsRandom ? aiRandomDomainLabel : null,
      };
      return await aiService.accept(payload);
    },
    onSuccess: async () => {
      setAiOpen(false);
      setAiProposal(null);
      toast.success('Zapisano wygenerowaną fiszkę.');
      await queryClient.invalidateQueries({ queryKey: FLASHCARDS_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: FLASHCARDS_QUERY_KEY });
    },
    onError: (e) => {
      if (e instanceof AiHttpError) {
        if (e.status === 401) return redirectToLogin();
        toast.error(e.message || 'Nie udało się zapisać fiszki.');
        return;
      }
      toast.error(e instanceof Error ? e.message : 'Nie udało się zapisać fiszki.');
    },
  });

  const aiRejectMutation = useMutation({
    mutationFn: async () => {
      return await aiService.reject({
        topic_id: props.topicId,
        is_random: aiIsRandom,
        random_domain_label: aiIsRandom ? aiRandomDomainLabel : null,
      });
    },
    onSuccess: () => {
      setAiOpen(false);
      setAiProposal(null);
      toast.success('Odrzucono propozycję.');
    },
    onError: (e) => {
      if (e instanceof AiHttpError) {
        if (e.status === 401) return redirectToLogin();
        toast.error(e.message || 'Nie udało się odrzucić propozycji.');
        return;
      }
      toast.error(e instanceof Error ? e.message : 'Nie udało się odrzucić propozycji.');
    },
  });

  const aiSkipMutation = useMutation({
    mutationFn: async () => {
      return await aiService.skip({
        topic_id: props.topicId,
        is_random: aiIsRandom,
        random_domain_label: aiIsRandom ? aiRandomDomainLabel : null,
      });
    },
  });

  useEffect(() => {
    if (!topicQuery.isError) return;
    const err = topicQuery.error;
    if (err instanceof TopicsHttpError) {
      if (err.status === 401) return redirectToLogin();
      if (err.status === 404) return redirectToCollections('topic_not_found');
    }
  }, [topicQuery.error, topicQuery.isError]);

  useEffect(() => {
    if (!flashcardsQuery.isError) return;
    const err = flashcardsQuery.error;
    if (err instanceof FlashcardsHttpError) {
      if (err.status === 401) return redirectToLogin();
      if (err.status === 404) return redirectToCollections('topic_not_found');
    }
  }, [flashcardsQuery.error, flashcardsQuery.isError]);

  const topicName =
    topicQuery.data?.name ?? url.context.topicNameFromUrl ?? 'Temat';

  const isRandomTopic =
    topicQuery.data?.systemKey === 'random_topic' ||
    url.context.topicNameFromUrl?.trim().toLowerCase() === 'temat losowy';

  const topicDescriptionRaw = topicQuery.data?.description ?? '';
  const topicDescriptionCleaned =
    topicDescriptionRaw.trim().toLowerCase() === 'example description.'
      ? ''
      : topicDescriptionRaw;
  const topicDescriptionLength = topicDescriptionCleaned.trim().length;

  const isAiBlockedByMissingDescription =
    !isRandomTopic && topicDescriptionLength < 1;
  const aiBlockedTooltip = isAiBlockedByMissingDescription
    ? 'Opis tematu jest wymagany, aby móc wygenerować fiszkę'
    : undefined;

  const onAiGenerateClick = useCallback(async () => {
    if (isAiBlockedByMissingDescription) {
      toast.error('Opis tematu jest wymagany, aby móc wygenerować fiszkę');
      return;
    }
    await aiGenerateMutation.mutateAsync();
  }, [aiGenerateMutation, isAiBlockedByMissingDescription]);

  const backHref =
    url.context.fromCollectionId
      ? (() => {
          const urlObj = new URL(
            `/collections/${encodeURIComponent(url.context.fromCollectionId)}/topics`,
            'http://local'
          );
          if (url.context.fromCollectionName) {
            urlObj.searchParams.set('collectionName', url.context.fromCollectionName);
          }
          return `${urlObj.pathname}${urlObj.search}`;
        })()
      : '/collections';

  const openEdit = useCallback((item: FlashcardItemVm) => {
    setEditTarget(item);
    editForm.reset({ front: item.front, back: item.back });
    editForm.clearErrors();
    setEditOpen(true);
  }, [editForm]);

  const openDelete = useCallback((item: FlashcardItemVm) => {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }, []);

  const openPreview = useCallback((item: FlashcardItemVm) => {
    setPreviewTarget(item);
    setPreviewOpen(true);
  }, []);

  const toggleFavorite = useCallback(
    async (item: FlashcardItemVm) => {
      await updateFlashcardMutation.mutateAsync({
        id: item.id,
        command: { is_favorite: !item.isFavorite },
      });
    },
    [updateFlashcardMutation]
  );

  const submitCreate = createForm.handleSubmit(async (values) => {
    await createFlashcardMutation.mutateAsync({
      front: clampTrimmed(values.front, 200),
      back: clampTrimmed(values.back, 600),
    });
  });

  const submitEdit = editForm.handleSubmit(async (values) => {
    if (!editTarget) {
      editForm.setError('root', { message: 'Nie wybrano fiszki do edycji.' });
      return;
    }
    await updateFlashcardMutation.mutateAsync({
      id: editTarget.id,
      command: {
        front: clampTrimmed(values.front, 200),
        back: clampTrimmed(values.back, 600),
      },
    });
  });

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteFlashcardMutation.mutateAsync(deleteTarget.id);
  }, [deleteFlashcardMutation, deleteTarget]);

  const closeAiModal = useCallback(async () => {
    setAiOpen(false);
    setAiProposal(null);
    try {
      await aiSkipMutation.mutateAsync();
    } catch {
      console.error('Failed to skip AI generation');
    }
  }, [aiSkipMutation]);

  return (
    <main className="p-4 md:p-8">
      <div className="space-y-3">
        <Button asChild variant="outline" size="sm" className="w-fit">
          <a href={backHref}>Wróć do tematu</a>
        </Button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">
              {topicName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isRandomTopic
                ? 'Temat losowy: generacja wybiera domenę po stronie serwera. Poniżej znajdziesz fiszki.'
                : 'Opis tematu edytujesz w modalu. Poniżej znajdziesz fiszki z tego tematu.'}
            </p>
          </div>
          {!isRandomTopic ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDescriptionStatus('idle');
                setDescriptionOpen(true);
              }}
            >
              Edytuj opis
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Input
          className="w-full"
          value={url.qDraft}
          onChange={(e) => url.setQDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') url.commitNow();
          }}
          placeholder="Szukaj w front/back…"
          aria-label="Szukaj fiszek"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Dodaj fiszkę
          </Button>
          <span className="inline-block" title={aiBlockedTooltip}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void onAiGenerateClick()}
              disabled={
                aiGenerateMutation.isPending || isAiBlockedByMissingDescription
              }
            >
              {aiGenerateMutation.isPending ? 'Generowanie…' : 'Generuj AI'}
            </Button>
          </span>
        </div>

        {flashcardsQuery.isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-live="polite">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-8 w-56 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : flashcardsQuery.isError ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium">Nie udało się załadować fiszek</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {flashcardsQuery.error instanceof Error
                  ? flashcardsQuery.error.message
                  : 'Spróbuj ponownie.'}
              </p>
              <Button className="mt-4" onClick={() => void flashcardsQuery.refetch()}>
                Spróbuj ponownie
              </Button>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium">Brak fiszek</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {url.qDraft
                  ? 'Brak fiszek spełniających kryteria wyszukiwania.'
                  : 'Dodaj pierwszą fiszkę manualnie lub wygeneruj ją przez AI.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {url.qDraft ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      url.setQDraft('');
                      url.commitNow();
                    }}
                  >
                    Wyczyść wyszukiwanie
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => setCreateOpen(true)}>Dodaj fiszkę</Button>
                    <span className="inline-block" title={aiBlockedTooltip}>
                      <Button
                        variant="secondary"
                        onClick={() => void onAiGenerateClick()}
                        disabled={
                          aiGenerateMutation.isPending ||
                          isAiBlockedByMissingDescription
                        }
                      >
                        Generuj AI
                      </Button>
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((f) => (
              <Card
                key={f.id}
                role="button"
                tabIndex={0}
                onClick={() => openPreview(f)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openPreview(f);
                  }
                }}
                className="cursor-pointer transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                aria-label={`Otwórz fiszkę: ${f.front}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="min-w-0 truncate font-medium">{f.front}</p>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full border px-2 py-0.5">
                            {f.source === 'manually_created' ? 'manual' : 'ai'}
                          </span>
                          {f.editedByUser ? (
                            <span className="rounded-full border px-2 py-0.5">
                              edytowana
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          disabled={updateFlashcardMutation.isPending}
                          size="icon"
                          aria-label={
                            f.isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'
                          }
                          aria-pressed={f.isFavorite}
                          title={
                            f.isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleFavorite(f);
                          }}
                        >
                          <Heart
                            className={
                              f.isFavorite
                                ? 'fill-red-500 text-red-500'
                                : 'fill-transparent text-muted-foreground'
                            }
                          />
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(f);
                          }}
                          aria-label="Edytuj fiszkę"
                          title="Edytuj fiszkę"
                        >
                          <Pencil />
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDelete(f);
                          }}
                          aria-label="Usuń fiszkę"
                          title="Usuń fiszkę"
                          className="text-destructive hover:text-destructive"
                        >
                          <X />
                        </Button>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
                        {f.back}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <FlashcardPreviewDialog
        open={previewOpen && !!previewTarget}
        flashcard={previewTarget ? { front: previewTarget.front, back: previewTarget.back } : null}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewTarget(null);
        }}
      />

      {!isRandomTopic ? (
        <TopicDescriptionDialog
          open={descriptionOpen}
          onOpenChange={(open) => {
            if (
              saveDescriptionMutation.isPending ||
              generateDescriptionMutation.isPending
            )
              return;
            setDescriptionOpen(open);
          }}
          form={descriptionForm}
          status={descriptionStatus}
          setStatus={setDescriptionStatus}
          isSaving={saveDescriptionMutation.isPending}
          isGenerating={generateDescriptionMutation.isPending}
          onGenerate={() => void generateDescriptionMutation.mutateAsync()}
          onSave={() => void saveDescriptionMutation.mutateAsync()}
        />
      ) : null}

      <CreateFlashcardDialog
        open={createOpen}
        onOpenChange={(open) => {
          if (createFlashcardMutation.isPending) return;
          setCreateOpen(open);
        }}
        form={createForm}
        isPending={createFlashcardMutation.isPending}
        onSubmit={(e) => void submitCreate(e)}
      />

      <EditFlashcardDialog
        open={editOpen}
        onOpenChange={(open) => {
          if (updateFlashcardMutation.isPending) return;
          setEditOpen(open);
        }}
        form={editForm}
        isPending={updateFlashcardMutation.isPending}
        sourceLabel={
          editTarget ? (editTarget.source === 'manually_created' ? 'manualne' : 'AI') : null
        }
        onSubmit={(e) => void submitEdit(e)}
      />

      <DeleteFlashcardConfirmDialog
        open={deleteOpen}
        flashcardFront={deleteTarget?.front ?? null}
        isDeleting={deleteFlashcardMutation.isPending}
        onOpenChange={setDeleteOpen}
        onConfirm={() => void confirmDelete()}
      />

      <AiProposalDialog
        open={aiOpen}
        proposal={aiProposal}
        limit={aiLimit}
        isAccepting={aiAcceptMutation.isPending}
        isRejecting={aiRejectMutation.isPending}
        onClose={() => void closeAiModal()}
        onReject={() => void aiRejectMutation.mutateAsync()}
        onAccept={(proposal) =>
          void aiAcceptMutation.mutateAsync({ front: proposal.front, back: proposal.back })
        }
      />
    </main>
  );
}

