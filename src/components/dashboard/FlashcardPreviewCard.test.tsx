import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { FavoriteFlashcardDto } from "@/types";
import { FlashcardPreviewCard } from "@/components/dashboard/FlashcardPreviewCard";

function makeFlashcard(overrides?: Partial<FavoriteFlashcardDto>): FavoriteFlashcardDto {
  return {
    id: "f1",
    topic_id: "t1",
    front: "Front",
    back: "one two three four five six seven eight nine ten eleven twelve",
    ...(overrides ?? {}),
  };
}

describe("FlashcardPreviewCard", () => {
  it("renders front and back", () => {
    render(<FlashcardPreviewCard flashcard={makeFlashcard()} />);

    expect(screen.getByText("Front")).toBeInTheDocument();
    expect(
      screen.getByText("one two three four five six seven eight nine ten eleven twelve")
    ).toBeInTheDocument();
  });

  it("calls onClick when card clicked and via Enter", () => {
    const onClick = vi.fn();
    const flashcard = makeFlashcard({ front: "Kliknij mnie" });

    render(<FlashcardPreviewCard flashcard={flashcard} onClick={onClick} />);

    const card = screen.getByRole("button", { name: /Otwórz fiszkę:/i });
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledWith(flashcard);

    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("calls onToggleFavorite and stops propagation (does not trigger onClick)", () => {
    const onClick = vi.fn();
    const onToggleFavorite = vi.fn();
    const flashcard = makeFlashcard({ front: "Fav" });

    render(
      <FlashcardPreviewCard
        flashcard={flashcard}
        onClick={onClick}
        onToggleFavorite={onToggleFavorite}
      />
    );

    const favButton = screen.getByRole("button", { name: "Usuń z ulubionych" });
    fireEvent.click(favButton);

    expect(onToggleFavorite).toHaveBeenCalledWith(flashcard);
    expect(onClick).not.toHaveBeenCalled();
  });
});

