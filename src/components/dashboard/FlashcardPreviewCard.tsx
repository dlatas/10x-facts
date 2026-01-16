import * as React from "react";

import type { FavoriteFlashcardDto } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const FlashcardPreviewCard = React.memo(function FlashcardPreviewCard(props: {
  flashcard: FavoriteFlashcardDto;
  onClick?: (flashcard: FavoriteFlashcardDto) => void;
  className?: string;
}) {
  const { flashcard, onClick } = props;

  const handleClick = React.useCallback(() => {
    onClick?.(flashcard);
  }, [flashcard, onClick]);

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
      <CardHeader className="pb-4">
        <CardTitle className="line-clamp-2">{props.flashcard.front}</CardTitle>
      </CardHeader>
    </Card>
  );
});
