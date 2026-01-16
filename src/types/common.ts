export type SortOrder = 'asc' | 'desc';

export interface ListResponse<TItem> {
  items: TItem[];
  total: number;
}

export interface OkResponse {
  ok: true;
}
