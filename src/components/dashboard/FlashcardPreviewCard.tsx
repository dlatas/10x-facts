import { memo, useCallback, useMemo } from "react";
import { Heart } from "lucide-react";

import type { FavoriteFlashcardDto } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const FlashcardPreviewCard = memo(function FlashcardPreviewCard(props: {
  flashcard: FavoriteFlashcardDto;
  onClick?: (flashcard: FavoriteFlashcardDto) => void;
  onToggleFavorite?: (flashcard: FavoriteFlashcardDto) => void;
  isTogglingFavorite?: boolean;
  className?: string;
}) {
  const { flashcard, onClick } = props;

  const handleClick = useCallback(() => {
    onClick?.(flashcard);
  }, [flashcard, onClick]);

  const backPreview = useMemo(() => {
    const words = (flashcard.back ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (words.length <= 10) return words.join(" ");
    return `${words.slice(0, 10).join(" ")}…`;
  }, [flashcard.back]);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "cursor-pointer transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        props.className
      )}
      aria-label={`Otwórz fiszkę: ${props.flashcard.front}`}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 leading-snug">{props.flashcard.front}</CardTitle>
          {props.onToggleFavorite ? (
            <Button
              variant="outline"
              size="icon"
              disabled={props.isTogglingFavorite}
              aria-label="Usuń z ulubionych"
              aria-pressed={true}
              title="Usuń z ulubionych"
              onClick={(e) => {
                e.stopPropagation();
                props.onToggleFavorite?.(flashcard);
              }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Heart className="fill-red-500 text-red-500" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-muted-foreground">{backPreview}</p>
      </CardContent>
    </Card>
  );
});
