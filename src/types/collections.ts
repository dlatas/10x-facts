import type { TablesInsert } from "../db/database.types";
import type { Collection } from "./entities";
import type { ListResponse, OkResponse, SortOrder } from "./common";

// Collections
export type CollectionDto = Pick<Collection, "id" | "name" | "system_key" | "created_at" | "updated_at">;

export interface CollectionsListQuery {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: keyof CollectionDto;
  order?: SortOrder;
}

export type CollectionsListResponseDto = ListResponse<CollectionDto>;
export type CreateCollectionCommand = Pick<TablesInsert<"collections">, "name">;
export type CreateCollectionResponseDto = CollectionDto;
export type DeleteCollectionResponseDto = OkResponse;
