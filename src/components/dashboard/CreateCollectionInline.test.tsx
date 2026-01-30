import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CreateCollectionInline } from "@/components/dashboard/CreateCollectionInline";

describe("CreateCollectionInline", () => {
  it("opens editor, trims input and calls onCreate on Enter", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(<CreateCollectionInline onCreate={onCreate} />);

    await user.click(screen.getByRole("button", { name: "Dodaj kolekcję" }));

    const input = screen.getByPlaceholderText("Nazwa kolekcji…");
    await user.type(input, "  Nowa  ");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith("Nowa"));
    expect(screen.getByRole("button", { name: "Dodaj kolekcję" })).toBeInTheDocument();
  });

  it("does nothing for empty/whitespace name", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(<CreateCollectionInline onCreate={onCreate} />);
    await user.click(screen.getByRole("button", { name: "Dodaj kolekcję" }));

    const input = screen.getByPlaceholderText("Nazwa kolekcji…");
    await user.type(input, "   ");
    await user.keyboard("{Enter}");

    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Dodaj" })).toBeDisabled();
  });

  it("cancels on Escape", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(<CreateCollectionInline onCreate={onCreate} />);
    await user.click(screen.getByRole("button", { name: "Dodaj kolekcję" }));

    const input = screen.getByPlaceholderText("Nazwa kolekcji…");
    await user.type(input, "Test");
    await user.keyboard("{Escape}");

    expect(screen.getByRole("button", { name: "Dodaj kolekcję" })).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });
});

