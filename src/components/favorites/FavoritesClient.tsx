import { useCallback, useEffect, useMemo, useState } from "react";

import type { CollectionDto, TopicDto, FlashcardDto, FavoriteFlashcardDto } from "@/types";
import { redirectToLogin } from "@/lib/http/redirect";
import { createCollectionsViewService, HttpError as CollectionsHttpError } from "@/lib/services/collections-view.service";
import {
  createCollectionTopicsViewService,
  HttpError as CollectionTopicsHttpError,
} from "@/lib/services/collection-topics-view.service";
import {
  createTopicFlashcardsViewService,
  HttpError as TopicFlashcardsHttpError,
} from "@/lib/services/topic-flashcards-view.service";

import { Button } from "@/components/ui/button";
import { FlashcardDetailsDialog } from "@/components/dashboard/FlashcardDetailsDialog";
import { FlashcardPreviewCard } from "@/components/dashboard/FlashcardPreviewCard";

const RANDOM_COLLECTION_SYSTEM_KEY = "random_collection";
const RANDOM_TOPIC_SYSTEM_KEY = "random_topic";
const ALL_TOPICS_VALUE = "__all__";
const ALL_COLLECTIONS_VALUE = "__all_collections__";

function mapCollectionLabel(dto: CollectionDto): string {
  if (dto.system_key === RANDOM_COLLECTION_SYSTEM_KEY) return "RANDOM";
  return dto.name;
}

function mapTopicLabel(dto: TopicDto): string {
  if (dto.system_key === RANDOM_TOPIC_SYSTEM_KEY) return "Temat Losowy";
  return dto.name;
}

export function FavoritesClient() {
  const collectionsService = useMemo(() => createCollectionsViewService(), []);
  const topicsService = useMemo(() => createCollectionTopicsViewService(), []);
  const flashcardsService = useMemo(() => createTopicFlashcardsViewService(), []);

  const [collections, setCollections] = useState<CollectionDto[]>([]);
  const [topics, setTopics] = useState<{ id: string; displayName: string; system_key: string | null }[]>([]);

  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(ALL_COLLECTIONS_VALUE);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(ALL_TOPICS_VALUE);

  const [favorites, setFavorites] = useState<FavoriteFlashcardDto[]>([]);

  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFlashcard, setSelectedFlashcard] = useState<FavoriteFlashcardDto | null>(
    null
  );

  const openFlashcard = useCallback((flashcard: FavoriteFlashcardDto) => {
    setSelectedFlashcard(flashcard);
    setIsModalOpen(true);
  }, []);

  const closeFlashcard = useCallback(() => {
    setIsModalOpen(false);
    setSelectedFlashcard(null);
  }, []);

  const refreshCollections = useCallback(async () => {
    setIsLoadingCollections(true);
    setError(null);
    try {
      const res = await collectionsService.getCollections({
        limit: 50,
        offset: 0,
        sort: "updated_at",
        order: "desc",
      });
      const items = Array.isArray(res.items) ? res.items : [];
      setCollections(items);
      setSelectedCollectionId(ALL_COLLECTIONS_VALUE);
    } catch (e) {
      if (e instanceof CollectionsHttpError && e.status === 401) {
        redirectToLogin();
        return;
      }
      setError(e instanceof Error ? e.message : "Nie udało się załadować kolekcji.");
    } finally {
      setIsLoadingCollections(false);
    }
  }, [collectionsService, selectedCollectionId]);

  const refreshTopics = useCallback(async () => {
    if (!selectedCollectionId) {
      setTopics([]);
      setSelectedTopicId(ALL_TOPICS_VALUE);
      return;
    }

    setIsLoadingTopics(true);
    setError(null);
    try {
      if (selectedCollectionId === ALL_COLLECTIONS_VALUE) {
        const sourceCollections = collections;
        if (sourceCollections.length === 0) {
          setTopics([]);
          setSelectedTopicId("");
          return;
        }

        const results = await Promise.all(
          sourceCollections.map(async (c) => {
            const res = await topicsService.getTopicsInCollection(c.id, {
              limit: 50,
              offset: 0,
              sort: "updated_at",
              order: "desc",
            });
            const items = Array.isArray(res.items) ? res.items : [];
            const isRandomCollection = c.system_key === RANDOM_COLLECTION_SYSTEM_KEY;
            const visible = isRandomCollection
              ? items.filter((t) => t.system_key === RANDOM_TOPIC_SYSTEM_KEY)
              : items;
            return visible.map((t) => ({
              id: t.id,
              system_key: t.system_key,
              displayName: `${mapCollectionLabel(c)} / ${mapTopicLabel(t)}`,
            }));
          })
        );

        const merged = results.flat();
        const deduped = Array.from(new Map(merged.map((t) => [t.id, t])).values());
        setTopics(deduped);
        setSelectedTopicId(deduped.length > 0 ? ALL_TOPICS_VALUE : "");
      } else {
        const res = await topicsService.getTopicsInCollection(selectedCollectionId, {
          limit: 50,
          offset: 0,
          sort: "updated_at",
          order: "desc",
        });
        const items = Array.isArray(res.items) ? res.items : [];

        const isRandomCollection =
          collections.find((c) => c.id === selectedCollectionId)?.system_key ===
          RANDOM_COLLECTION_SYSTEM_KEY;
        const visible = isRandomCollection
          ? items.filter((t) => t.system_key === RANDOM_TOPIC_SYSTEM_KEY)
          : items;

        const mapped = visible.map((t) => ({
          id: t.id,
          system_key: t.system_key,
          displayName: mapTopicLabel(t),
        }));

        setTopics(mapped);
        setSelectedTopicId(mapped.length > 0 ? ALL_TOPICS_VALUE : "");
      }
    } catch (e) {
      if (e instanceof CollectionTopicsHttpError && e.status === 401) {
        redirectToLogin();
        return;
      }
      setError(e instanceof Error ? e.message : "Nie udało się załadować tematów.");
    } finally {
      setIsLoadingTopics(false);
    }
  }, [collections, selectedCollectionId, topicsService]);

  const fetchFavoritesForTopic = useCallback(
    async (topicId: string): Promise<FavoriteFlashcardDto[]> => {
      const res = await flashcardsService.list(topicId, {
        is_favorite: true,
        limit: 100,
        offset: 0,
        sort: "updated_at",
        order: "desc",
      });

      const items = Array.isArray(res.items) ? res.items : [];
      return items.map((dto: FlashcardDto) => ({
        id: dto.id,
        front: dto.front,
        back: dto.back,
        topic_id: topicId,
      }));
    },
    [flashcardsService]
  );

  const refreshFavorites = useCallback(async () => {
    if (!selectedTopicId || topics.length === 0) {
      setFavorites([]);
      return;
    }

    setIsLoadingFavorites(true);
    setError(null);
    try {
      if (selectedTopicId === ALL_TOPICS_VALUE) {
        const topicIds = topics.map((t) => t.id).filter(Boolean);
        const results = await Promise.all(topicIds.map((id) => fetchFavoritesForTopic(id)));
        const merged = results.flat();
        const deduped = Array.from(new Map(merged.map((f) => [f.id, f])).values());
        setFavorites(deduped);
      } else {
        const mapped = await fetchFavoritesForTopic(selectedTopicId);
        setFavorites(mapped);
      }
    } catch (e) {
      if (e instanceof TopicFlashcardsHttpError && e.status === 401) {
        redirectToLogin();
        return;
      }
      setError(
        e instanceof Error ? e.message : "Nie udało się załadować ulubionych fiszek."
      );
    } finally {
      setIsLoadingFavorites(false);
    }
  }, [fetchFavoritesForTopic, selectedTopicId, topics]);

  useEffect(() => {
    void refreshCollections();
  }, []);

  useEffect(() => {
    void refreshTopics();
  }, [refreshTopics]);

  useEffect(() => {
    void refreshFavorites();
  }, [refreshFavorites]);

  const unfavorite = useCallback(
    async (flashcard: FavoriteFlashcardDto) => {
      if (isTogglingFavorite) return;
      setIsTogglingFavorite(true);
      setError(null);
      try {
        await flashcardsService.update(flashcard.id, { is_favorite: false });
        setFavorites((prev) => prev.filter((f) => f.id !== flashcard.id));
        if (selectedFlashcard?.id === flashcard.id) {
          closeFlashcard();
        }
      } catch (e) {
        if (e instanceof TopicFlashcardsHttpError && e.status === 401) {
          redirectToLogin();
          return;
        }
        setError(e instanceof Error ? e.message : "Nie udało się usunąć z ulubionych.");
      } finally {
        setIsTogglingFavorite(false);
      }
    },
    [closeFlashcard, flashcardsService, isTogglingFavorite, selectedFlashcard?.id]
  );

  const isLoading = isLoadingCollections || isLoadingTopics || isLoadingFavorites;

  return (
    <main className="p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Ulubione</h1>
        <p className="text-sm text-muted-foreground">
          Wybierz kolekcję. Domyślnie pokazujemy ulubione ze wszystkich tematów.
        </p>
      </div>

      <div className="mt-6 rounded-xl border p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="favorites-collection">
              Kolekcja
            </label>
            <select
              id="favorites-collection"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedCollectionId}
              disabled={isLoadingCollections || collections.length === 0}
              onChange={(e) => {
                setSelectedCollectionId(e.currentTarget.value);
                setSelectedTopicId(ALL_TOPICS_VALUE);
              }}
            >
              <option value={ALL_COLLECTIONS_VALUE}>Wszystkie</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {mapCollectionLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="favorites-topic">
              Temat
            </label>
            <select
              id="favorites-topic"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedTopicId}
              disabled={isLoadingTopics || topics.length === 0}
              onChange={(e) => setSelectedTopicId(e.currentTarget.value)}
            >
              <option value={ALL_TOPICS_VALUE}>Wszystkie</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {selectedTopicId
              ? `Znaleziono: ${favorites.length}`
              : "Wybierz temat."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshFavorites()}
            disabled={!selectedTopicId || isLoadingFavorites || isTogglingFavorite}
          >
            Odśwież
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border p-4">
          <p className="text-sm font-medium">Coś poszło nie tak</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      ) : null}

      <section className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="rounded-xl border p-6">
            <h3 className="text-sm font-semibold">Brak ulubionych fiszek</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedTopicId === ALL_TOPICS_VALUE
                ? "W tej kolekcji nie ma jeszcze ulubionych fiszek."
                : "W tym temacie nie ma jeszcze ulubionych fiszek."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {favorites.map((f) => (
              <FlashcardPreviewCard
                key={f.id}
                flashcard={f}
                onClick={openFlashcard}
                onToggleFavorite={unfavorite}
                isTogglingFavorite={isTogglingFavorite}
              />
            ))}
          </div>
        )}
      </section>

      <FlashcardDetailsDialog
        isOpen={isModalOpen}
        onClose={closeFlashcard}
        flashcard={selectedFlashcard}
        onToggleFavorite={selectedFlashcard ? () => void unfavorite(selectedFlashcard) : undefined}
        isTogglingFavorite={isTogglingFavorite}
      />
    </main>
  );
}

