// Base API types used by generated OpenAPI types
// These are the common response wrappers and pagination types

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  links?: PaginationLinks;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface PaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}
