import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Heart, Pencil, X } from 'lucide-react';

import type {
  CreateFlashcardCommand,
  FlashcardsListQuery,
  UpdateFlashcardCommand,
} from '@/types';
import { createCollectionTopicsViewService, HttpError as TopicsHttpError } from '@/lib/services/collection-topics-view.service';
import { createTopicFlashcardsViewService, HttpError as FlashcardsHttpError } from '@/lib/services/topic-flashcards-view.service';
import { createAiViewService, HttpError as AiHttpError } from '@/lib/services/ai-view.service';
import { fireConfetti } from '../../lib/confetti';
import { useTopicUrlState } from './useTopicUrlState';
import { mapFlashcardDtoToVm, mapTopicDtoToVm } from './topic.types';
import type { FlashcardItemVm, TopicHeaderVm } from './topic.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const TOPIC_QUERY_KEY = ['topic'] as const;
const FLASHCARDS_QUERY_KEY = ['flashcards'] as const;

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  window.location.assign('/login');
}

function redirectToCollections(reason?: string): void {
  if (typeof window === 'undefined') return;
  const url = reason ? `/collections?reason=${encodeURIComponent(reason)}` : '/collections';
  window.location.assign(url);
}

function clampTrimmed(value: string, maxLen: number): string {
  const t = value.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim();
}

export function TopicClientInner(props: { topicId: string }) {
  const queryClient = useQueryClient();

  const url = useTopicUrlState({ debounceMs: 300 });

  const topicsService = React.useMemo(() => createCollectionTopicsViewService(), []);
  const flashcardsService = React.useMemo(() => createTopicFlashcardsViewService(), []);
  const aiService = React.useMemo(() => createAiViewService(), []);

  const [descriptionOpen, setDescriptionOpen] = React.useState(false);
  const [descriptionDraft, setDescriptionDraft] = React.useState('');
  const [descriptionStatus, setDescriptionStatus] = React.useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createFront, setCreateFront] = React.useState('');
  const [createBack, setCreateBack] = React.useState('');
  const [createError, setCreateError] = React.useState<string | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<FlashcardItemVm | null>(null);
  const [editFront, setEditFront] = React.useState('');
  const [editBack, setEditBack] = React.useState('');
  const [editError, setEditError] = React.useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<FlashcardItemVm | null>(null);

  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewTarget, setPreviewTarget] = React.useState<FlashcardItemVm | null>(null);

  const [aiOpen, setAiOpen] = React.useState(false);
  const [aiProposal, setAiProposal] = React.useState<{ front: string; back: string } | null>(
    null
  );
  const [aiIsRandom, setAiIsRandom] = React.useState(false);
  const [aiRandomDomainLabel, setAiRandomDomainLabel] = React.useState<string | null>(null);
  const [aiLimit, setAiLimit] = React.useState<{ remaining: number; reset_at_utc: string } | null>(
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
      // Brak GET /api/v1/topics/:topicId. Jeśli mamy fromCollectionId,
      // pobieramy listę tematów w tej kolekcji i wyszukujemy po id.
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
        // jeśli topicId nie jest w tej kolekcji (albo brak dostępu) – traktuj jak 404 kontekstu
        throw new TopicsHttpError(404, 'Nie znaleziono tematu w kolekcji.');
      }
      return mapTopicDtoToVm(found);
    },
    retry: false,
  });

  React.useEffect(() => {
    if (!topicQuery.data) return;
    // inicjalizacja draftu opisu po załadowaniu tematu
    const raw = topicQuery.data.description ?? '';
    // legacy fallback: kiedyś DB miało default "example description."
    const cleaned =
      raw.trim().toLowerCase() === 'example description.' ? '' : raw;
    setDescriptionDraft(cleaned);
  }, [topicQuery.data]);

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

  const items = React.useMemo(() => {
    const dto = flashcardsQuery.data?.items ?? [];
    return dto.map(mapFlashcardDtoToVm);
  }, [flashcardsQuery.data?.items]);

  const saveDescriptionMutation = useMutation({
    mutationFn: async () => {
      // PATCH /api/v1/topics/:topicId
      const res = await fetch(`/api/v1/topics/${encodeURIComponent(props.topicId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: descriptionDraft }),
      });
      if (res.ok) return;
      const text = await res.text().catch(() => '');
      if (res.status === 401) throw new Error('Brak autoryzacji (401).');
      if (res.status === 404) throw new Error('Nie znaleziono tematu.');
      throw new Error(text || `Błąd API (${res.status}).`);
    },
    onMutate: () => {
      setDescriptionStatus('saving');
    },
    onSuccess: () => {
      setDescriptionStatus('saved');
      toast.success('Zapisano opis tematu.');
      // odśwież dane tematu (jeśli pochodzą z kolekcji)
      void queryClient.invalidateQueries({ queryKey: TOPIC_QUERY_KEY });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : 'Nie udało się zapisać opisu.';
      setDescriptionStatus('error');
      toast.error(msg);
    },
  });

  const generateDescriptionMutation = useMutation({
    mutationFn: async () => {
      return await aiService.generateTopicDescription({ topic_id: props.topicId });
    },
    onSuccess: (res) => {
      setDescriptionDraft(res.description ?? '');
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
      setCreateFront('');
      setCreateBack('');
      setCreateError(null);
      toast.success('Dodano fiszkę.');
      await queryClient.invalidateQueries({ queryKey: FLASHCARDS_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: FLASHCARDS_QUERY_KEY });
    },
    onError: (e) => {
      if (e instanceof FlashcardsHttpError) {
        if (e.status === 401) return redirectToLogin();
        if (e.status === 404) return redirectToCollections('topic_not_found');
        setCreateError(e.message || 'Nie udało się dodać fiszki.');
        return;
      }
      setCreateError(e instanceof Error ? e.message : 'Nie udało się dodać fiszki.');
    },
  });

  const updateFlashcardMutation = useMutation({
    mutationFn: async (args: { id: string; command: UpdateFlashcardCommand }) => {
      return await flashcardsService.update(args.id, args.command);
    },
    onSuccess: async () => {
      setEditOpen(false);
      setEditTarget(null);
      setEditFront('');
      setEditBack('');
      setEditError(null);
      toast.success('Zapisano zmiany fiszki.');
      await queryClient.invalidateQueries({ queryKey: FLASHCARDS_QUERY_KEY });
    },
    onError: (e) => {
      if (e instanceof FlashcardsHttpError) {
        if (e.status === 401) return redirectToLogin();
        setEditError(e.message || 'Nie udało się zapisać fiszki.');
        return;
      }
      setEditError(e instanceof Error ? e.message : 'Nie udało się zapisać fiszki.');
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

      // Konfetti w momencie, gdy wygenerowana fiszka pojawia się w UI (modal z propozycją).
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

  // Map errors -> redirect where appropriate
  React.useEffect(() => {
    if (!topicQuery.isError) return;
    const err = topicQuery.error;
    if (err instanceof TopicsHttpError) {
      if (err.status === 401) return redirectToLogin();
      if (err.status === 404) return redirectToCollections('topic_not_found');
    }
  }, [topicQuery.error, topicQuery.isError]);

  React.useEffect(() => {
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
  // legacy fallback: kiedyś DB miało default "example description."
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

  const onAiGenerateClick = React.useCallback(async () => {
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

  const openEdit = React.useCallback((item: FlashcardItemVm) => {
    setEditTarget(item);
    setEditFront(item.front);
    setEditBack(item.back);
    setEditError(null);
    setEditOpen(true);
  }, []);

  const openDelete = React.useCallback((item: FlashcardItemVm) => {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }, []);

  const openPreview = React.useCallback((item: FlashcardItemVm) => {
    setPreviewTarget(item);
    setPreviewOpen(true);
  }, []);

  const toggleFavorite = React.useCallback(
    async (item: FlashcardItemVm) => {
      await updateFlashcardMutation.mutateAsync({
        id: item.id,
        command: { is_favorite: !item.isFavorite },
      });
    },
    [updateFlashcardMutation]
  );

  const submitCreate = React.useCallback(async () => {
    const front = clampTrimmed(createFront, 200);
    const back = clampTrimmed(createBack, 600);
    if (!front) return setCreateError('Front jest wymagany (max 200 znaków).');
    if (!back) return setCreateError('Back jest wymagany (max 600 znaków).');
    setCreateError(null);
    await createFlashcardMutation.mutateAsync({ front, back });
  }, [createBack, createFlashcardMutation, createFront]);

  const submitEdit = React.useCallback(async () => {
    if (!editTarget) return;
    const front = clampTrimmed(editFront, 200);
    const back = clampTrimmed(editBack, 600);
    if (!front) return setEditError('Front jest wymagany (max 200 znaków).');
    if (!back) return setEditError('Back jest wymagany (max 600 znaków).');
    setEditError(null);
    await updateFlashcardMutation.mutateAsync({
      id: editTarget.id,
      command: { front, back },
    });
  }, [editBack, editFront, editTarget, updateFlashcardMutation]);

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget) return;
    await deleteFlashcardMutation.mutateAsync(deleteTarget.id);
  }, [deleteFlashcardMutation, deleteTarget]);

  const closeAiModal = React.useCallback(async () => {
    setAiOpen(false);
    setAiProposal(null);
    // best-effort: log skip
    try {
      await aiSkipMutation.mutateAsync();
    } catch {
      // ignore
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
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
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

      {/* Modal: podgląd fiszki */}
      <Dialog
        open={previewOpen && !!previewTarget}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewOpen(false);
            setPreviewTarget(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl md:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="pr-8">{previewTarget?.front ?? ''}</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap">
              {previewTarget?.back ?? ''}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Modal: opis tematu (niedostępny dla tematu losowego) */}
      {!isRandomTopic ? (
        <Dialog
          open={descriptionOpen}
          onOpenChange={(open) => {
            if (
              saveDescriptionMutation.isPending ||
              generateDescriptionMutation.isPending
            )
              return;
            setDescriptionOpen(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opis tematu</DialogTitle>
              <DialogDescription>
                Opis wpływa na jakość generowania AI. Zapis jest manualny.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="topic-description">
                Opis
              </label>
              <textarea
                id="topic-description"
                value={descriptionDraft}
                onChange={(e) => {
                  setDescriptionDraft(e.target.value);
                  if (descriptionStatus !== 'idle') setDescriptionStatus('idle');
                }}
                placeholder='Wprowadź swój opis tematu lub kliknij przycisk „Generuj opis”.'
                disabled={
                  saveDescriptionMutation.isPending ||
                  generateDescriptionMutation.isPending
                }
                className="min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              {descriptionDraft.trim().length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Wskazówka: pusty opis może obniżyć jakość propozycji AI.
                </p>
              ) : null}
              {descriptionStatus === 'saved' ? (
                <p className="text-sm text-muted-foreground">Zapisano.</p>
              ) : descriptionStatus === 'error' ? (
                <p className="text-sm text-destructive">Nie udało się zapisać.</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDescriptionOpen(false)}
                disabled={
                  saveDescriptionMutation.isPending ||
                  generateDescriptionMutation.isPending
                }
              >
                Zamknij
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void generateDescriptionMutation.mutateAsync()}
                disabled={
                  saveDescriptionMutation.isPending ||
                  generateDescriptionMutation.isPending
                }
              >
                {generateDescriptionMutation.isPending
                  ? 'Generowanie…'
                  : 'Generuj opis'}
              </Button>
              <Button
                type="button"
                onClick={() => void saveDescriptionMutation.mutateAsync()}
                disabled={
                  saveDescriptionMutation.isPending ||
                  generateDescriptionMutation.isPending
                }
              >
                {saveDescriptionMutation.isPending ? 'Zapisywanie…' : 'Zapisz'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Modal: dodaj fiszkę */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (createFlashcardMutation.isPending) return;
          setCreateOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj fiszkę</DialogTitle>
            <DialogDescription>Tworzenie manualne. Front ≤ 200, back ≤ 600.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="create-front">
                Front
              </label>
              <Input
                id="create-front"
                value={createFront}
                onChange={(e) => setCreateFront(e.target.value)}
                disabled={createFlashcardMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="create-back">
                Back
              </label>
              <textarea
                id="create-back"
                value={createBack}
                onChange={(e) => setCreateBack(e.target.value)}
                disabled={createFlashcardMutation.isPending}
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createFlashcardMutation.isPending}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              onClick={() => void submitCreate()}
              disabled={createFlashcardMutation.isPending}
            >
              {createFlashcardMutation.isPending ? 'Dodawanie…' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: edytuj fiszkę */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (updateFlashcardMutation.isPending) return;
          setEditOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj fiszkę</DialogTitle>
            <DialogDescription>Źródło jest tylko do odczytu.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="edit-front">
                Front
              </label>
              <Input
                id="edit-front"
                value={editFront}
                onChange={(e) => setEditFront(e.target.value)}
                disabled={updateFlashcardMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="edit-back">
                Back
              </label>
              <textarea
                id="edit-back"
                value={editBack}
                onChange={(e) => setEditBack(e.target.value)}
                disabled={updateFlashcardMutation.isPending}
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {editTarget ? (
              <p className="text-xs text-muted-foreground">
                Źródło: {editTarget.source === 'manually_created' ? 'manualne' : 'AI'}
              </p>
            ) : null}
            {editError ? <p className="text-sm text-destructive">{editError}</p> : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={updateFlashcardMutation.isPending}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              onClick={() => void submitEdit()}
              disabled={updateFlashcardMutation.isPending}
            >
              {updateFlashcardMutation.isPending ? 'Zapisywanie…' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm: usuń fiszkę */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (deleteFlashcardMutation.isPending) return;
          setDeleteOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usunąć fiszkę?</DialogTitle>
            <DialogDescription>Ta operacja jest nieodwracalna.</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="text-muted-foreground">Front:</p>
            <p className="font-medium">{deleteTarget?.front ?? '—'}</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteFlashcardMutation.isPending}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleteFlashcardMutation.isPending}
            >
              {deleteFlashcardMutation.isPending ? 'Usuwanie…' : 'Usuń'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: AI preview */}
      <Dialog
        open={aiOpen}
        onOpenChange={(open) => {
          if (!open) void closeAiModal();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl md:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Propozycja AI</DialogTitle>
            <DialogDescription>
              {aiLimit ? (
                <span>
                  Pozostałe decyzje: <strong>{aiLimit.remaining}</strong> (reset:{' '}
                  {aiLimit.reset_at_utc})
                </span>
              ) : (
                'Zapisz albo odrzuć propozycję.'
              )}
            </DialogDescription>
          </DialogHeader>

          {aiProposal ? (
            <div className="space-y-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Front</p>
                <p className="mt-1 font-medium">{aiProposal.front}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Back</p>
                <p className="mt-1 text-sm">{aiProposal.back}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Brak danych propozycji.</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => void closeAiModal()}
              disabled={aiAcceptMutation.isPending || aiRejectMutation.isPending}
            >
              Zamknij
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void aiRejectMutation.mutateAsync()}
              disabled={!aiProposal || aiAcceptMutation.isPending || aiRejectMutation.isPending}
            >
              {aiRejectMutation.isPending ? 'Odrzucanie…' : 'Odrzuć'}
            </Button>
            <Button
              type="button"
              onClick={() =>
                aiProposal
                  ? void aiAcceptMutation.mutateAsync({
                      front: aiProposal.front,
                      back: aiProposal.back,
                    })
                  : undefined
              }
              disabled={!aiProposal || aiAcceptMutation.isPending || aiRejectMutation.isPending}
            >
              {aiAcceptMutation.isPending ? 'Zapisywanie…' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

