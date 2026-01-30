import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { FavoriteFlashcardDto } from "@/types";
import { RandomFavoritesGrid } from "@/components/dashboard/RandomFavoritesGrid";

function makeFlashcard(overrides?: Partial<FavoriteFlashcardDto>): FavoriteFlashcardDto {
  return {
    id: "f1",
    topic_id: "t1",
    front: "Front",
    back: "Back",
    ...(overrides ?? {}),
  };
}

describe("RandomFavoritesGrid", () => {
  it("renders skeletons when loading", () => {
    const { container } = render(
      <RandomFavoritesGrid
        flashcards={[]}
        loading={true}
        onCardClick={vi.fn()}
      />
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBe(10);
  });

  it("renders empty state and calls onRetry", () => {
    const onRetry = vi.fn();
    render(
      <RandomFavoritesGrid
        flashcards={[]}
        loading={false}
        onCardClick={vi.fn()}
        onRetry={onRetry}
      />
    );

    expect(screen.getByText("Brak ulubionych fiszek")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Odśwież" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders flashcards and forwards click handler", () => {
    const onCardClick = vi.fn();
    const flashcards = [makeFlashcard({ id: "a", front: "A" }), makeFlashcard({ id: "b", front: "B" })];

    render(
      <RandomFavoritesGrid
        flashcards={flashcards}
        loading={false}
        onCardClick={onCardClick}
      />
    );

    const cardA = screen.getByRole("button", { name: "Otwórz fiszkę: A" });
    fireEvent.click(cardA);
    expect(onCardClick).toHaveBeenCalledWith(flashcards[0]);
  });
});

