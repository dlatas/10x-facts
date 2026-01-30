import * as React from 'react';

import type { FavoriteFlashcardDto } from '@/types';
import { useDashboardData } from '@/components/hooks/useDashboardData';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { RandomFavoritesGrid } from '@/components/dashboard/RandomFavoritesGrid';
import { FlashcardDetailsDialog } from '@/components/dashboard/FlashcardDetailsDialog';
import { Button } from '@/components/ui/button';

export function DashboardClient() {
  const {
    collections,
    favorites,
    isLoading,
    isCreatingCollection,
    isUpdatingFavorite,
    error,
    refreshAll,
    createCollection,
    setFavorite,
  } = useDashboardData();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedFlashcard, setSelectedFlashcard] =
    React.useState<FavoriteFlashcardDto | null>(null);

  const openFlashcard = React.useCallback((flashcard: FavoriteFlashcardDto) => {
    setSelectedFlashcard(flashcard);
    setIsModalOpen(true);
  }, []);

  const closeFlashcard = React.useCallback(() => {
    setIsModalOpen(false);
    setSelectedFlashcard(null);
  }, []);

  const unfavorite = React.useCallback(
    async (flashcard: FavoriteFlashcardDto) => {
      // Dashboard pokazuje tylko ulubione; odpięcie usuwa z sekcji.
      await setFavorite(flashcard.id, false);
      if (selectedFlashcard?.id === flashcard.id) {
        closeFlashcard();
      }
    },
    [closeFlashcard, selectedFlashcard?.id, setFavorite]
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col md:flex-row">
      <DashboardSidebar
        collections={collections}
        onCollectionCreate={createCollection}
        isLoading={isLoading}
        isCreatingCollection={isCreatingCollection}
      />

      <main className="flex-1 p-4 md:p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Błyśnij ciekawostką: 10 losowych ulubionych fiszek.
            </p>
          </div>

          <Button variant="default" size="sm" asChild>
            <a href="/favorites">Wszystkie ulubione</a>
          </Button>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border p-6">
            <p className="text-sm font-medium">
              Nie udało się załadować danych
            </p>

            <p className="mt-1 text-sm text-muted-foreground">{error}</p>

            <Button
              className="mt-4"
              onClick={() => void refreshAll()}
            >
              Spróbuj ponownie
            </Button>
          </div>
        ) : null}

        <section className="mt-6">
          <RandomFavoritesGrid
            flashcards={favorites}
            loading={isLoading}
            onCardClick={openFlashcard}
            onToggleFavorite={unfavorite}
            isTogglingFavorite={isUpdatingFavorite}
            onRetry={() => void refreshAll()}
          />
        </section>

        <FlashcardDetailsDialog
          isOpen={isModalOpen}
          onClose={closeFlashcard}
          flashcard={selectedFlashcard}
          onToggleFavorite={selectedFlashcard ? () => void unfavorite(selectedFlashcard) : undefined}
          isTogglingFavorite={isUpdatingFavorite}
        />
      </main>
    </div>
  );
}
