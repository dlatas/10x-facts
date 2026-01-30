import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { CollectionDto } from "@/types";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

function makeCollection(overrides?: Partial<CollectionDto>): CollectionDto {
  return {
    id: "c1",
    name: "Moja kolekcja",
    system_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...(overrides ?? {}),
  };
}

describe("DashboardSidebar", () => {
  it("shows loading skeleton when isLoading=true", () => {
    const onCollectionCreate = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <DashboardSidebar
        collections={[makeCollection({ name: "Nie powinno się pokazać" })]}
        isLoading={true}
        onCollectionCreate={onCollectionCreate}
      />
    );

    expect(
      screen.queryByText("Nie powinno się pokazać")
    ).not.toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders collections with correct labels, href and SystemBadge", () => {
    const onCollectionCreate = vi.fn().mockResolvedValue(undefined);

    const random = makeCollection({
      id: "rand",
      name: "Ignored",
      system_key: "random_collection",
    });
    const system = makeCollection({
      id: "sys",
      name: "System X",
      system_key: "some_system",
    });
    const normal = makeCollection({
      id: "norm",
      name: "Normalna",
      system_key: null,
    });

    render(
      <DashboardSidebar
        collections={[random, system, normal]}
        isLoading={false}
        onCollectionCreate={onCollectionCreate}
      />
    );

    expect(
      screen.getByRole("link", { name: "Wszystkie kolekcje" })
    ).toHaveAttribute(
      "href",
      "/collections"
    );

    const randomLink = screen.getByRole("link", { name: /Kolekcja Losowa/i });
    expect(randomLink).toHaveAttribute(
      "href",
      "/collections/rand/topics?collectionName=Kolekcja%20Losowa"
    );
    expect(screen.getByText("Kolekcja losowa")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /System X/i })).toHaveAttribute(
      "href",
      "/collections/sys/topics?collectionName=System%20X"
    );
    expect(screen.getByText("Systemowa")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Normalna/i })).toHaveAttribute(
      "href",
      "/collections/norm/topics?collectionName=Normalna"
    );
  });
});

