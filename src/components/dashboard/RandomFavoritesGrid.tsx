import type { FavoriteFlashcardDto } from '@/types';
import { FlashcardPreviewCard } from '@/components/dashboard/FlashcardPreviewCard';
import { Button } from '@/components/ui/button';

export function RandomFavoritesGrid(props: {
  flashcards: FavoriteFlashcardDto[];
  onCardClick: (flashcard: FavoriteFlashcardDto) => void;
  onToggleFavorite?: (flashcard: FavoriteFlashcardDto) => void;
  isTogglingFavorite?: boolean;
  loading: boolean;
  onRetry?: () => void;
}) {
  if (props.loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border bg-muted"
          />
        ))}
      </div>
    );
  }

  if (props.flashcards.length === 0) {
    return (
      <div className="rounded-xl border p-6">
        <h3 className="text-sm font-semibold">Brak ulubionych fiszek</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Dodaj fiszki do ulubionych, aby móc „błysnąć ciekawostką” na
          Dashboardzie.
        </p>
        {props.onRetry ? (
          <Button
            className="mt-4"
            variant="outline"
            onClick={props.onRetry}
          >
            Odśwież
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {props.flashcards.map((f) => (
        <FlashcardPreviewCard
          key={f.id}
          flashcard={f}
          onClick={props.onCardClick}
          onToggleFavorite={props.onToggleFavorite}
          isTogglingFavorite={props.isTogglingFavorite}
        />
      ))}
    </div>
  );
}
