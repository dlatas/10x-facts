import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { CollectionDto, FavoriteFlashcardDto } from "@/types";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { useDashboardData } from "@/components/hooks/useDashboardData";

vi.mock("@/components/hooks/useDashboardData", () => ({
  useDashboardData: vi.fn(),
}));

vi.mock("@/components/dashboard/FlashcardDetailsDialog", () => ({
  FlashcardDetailsDialog: (props: {
    isOpen: boolean;
    onClose: () => void;
    flashcard: FavoriteFlashcardDto | null;
    onToggleFavorite?: () => void;
  }) => {
    if (!props.isOpen || !props.flashcard) return null;
    return (
      <div data-testid="details-dialog">
        <div>Dialog: {props.flashcard.front}</div>
        {props.onToggleFavorite ? (
          <button type="button" onClick={() => props.onToggleFavorite?.()}>
            toggle-fav
          </button>
        ) : null}
        <button type="button" onClick={props.onClose}>
          close
        </button>
      </div>
    );
  },
}));

function makeCollection(overrides?: Partial<CollectionDto>): CollectionDto {
  return {
    id: "c1",
    name: "Kolekcja",
    system_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...(overrides ?? {}),
  };
}

function makeFlashcard(overrides?: Partial<FavoriteFlashcardDto>): FavoriteFlashcardDto {
  return {
    id: "f1",
    topic_id: "t1",
    front: "Front",
    back: "Back",
    ...(overrides ?? {}),
  };
}

describe("DashboardClient (view)", () => {
  it("renders error box and calls refreshAll on retry", () => {
    type DashboardHookReturn = ReturnType<typeof useDashboardData>;

    const refreshAll = vi.fn();
    const data = {
      collections: [],
      favorites: [],
      isLoading: false,
      isCreatingCollection: false,
      isUpdatingFavorite: false,
      error: "Błąd X",
      refreshAll,
      createCollection: vi.fn(() => Promise.resolve()),
      setFavorite: vi.fn(() => Promise.resolve()),
      refreshCollections: vi.fn(() => Promise.resolve()),
      refreshFavorites: vi.fn(() => Promise.resolve()),
    } satisfies DashboardHookReturn;

    vi.mocked(useDashboardData).mockReturnValue(data);

    render(<DashboardClient />);

    expect(
      screen.getByText("Nie udało się załadować danych")
    ).toBeInTheDocument();
    expect(screen.getByText("Błąd X")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    expect(refreshAll).toHaveBeenCalledTimes(1);
  });

  it("opens details dialog on card click and unfavorites via dialog action", async () => {
    type DashboardHookReturn = ReturnType<typeof useDashboardData>;

    const setFavorite = vi.fn().mockResolvedValue(undefined);
    const data = {
      collections: [makeCollection()],
      favorites: [makeFlashcard({ id: "fx", front: "Fiszka X" })],
      isLoading: false,
      isCreatingCollection: false,
      isUpdatingFavorite: false,
      error: null,
      refreshAll: vi.fn(),
      createCollection: vi.fn(() => Promise.resolve()),
      setFavorite: setFavorite as unknown as DashboardHookReturn["setFavorite"],
      refreshCollections: vi.fn(() => Promise.resolve()),
      refreshFavorites: vi.fn(() => Promise.resolve()),
    } satisfies DashboardHookReturn;

    vi.mocked(useDashboardData).mockReturnValue(data);

    render(<DashboardClient />);

    fireEvent.click(screen.getByRole("button", { name: "Otwórz fiszkę: Fiszka X" }));
    expect(screen.getByTestId("details-dialog")).toHaveTextContent("Dialog: Fiszka X");

    fireEvent.click(screen.getByRole("button", { name: "toggle-fav" }));
    expect(setFavorite).toHaveBeenCalledWith("fx", false);

    await waitFor(() =>
      expect(screen.queryByTestId("details-dialog")).not.toBeInTheDocument()
    );
  });
});

