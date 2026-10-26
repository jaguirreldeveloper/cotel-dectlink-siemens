/**
 * @cotel/types - Shared TypeScript types for COTEL DECTlink
 * 
 * This package provides:
 * - API response/request types (generated from OpenAPI)
 * - Shared enums and constants
 * - Common utility types
 */

// Enums (manual, shared across all packages)
export * from './enums';

// API Types (generated from OpenAPI - DO NOT EDIT MANUALLY)
export * from './api';

// Re-export commonly used types
export type {
  SubscriberServiceStatus,
  SubscriberOperationalStatus,
  FauModel,
  FaultType,
  WorkOrderStatus,
  WorkOrderPriority,
  MaterialType,
  UnitOfMeasure,
  UserRole,
  AuditAction,
  DataSourceType
} from './enums';

export type {
  ApiResponse,
  PaginationMeta,
  PaginationLinks,
  ApiError,
  SubscriberResponse,
  SubscriberStatusUpdateRequest,
  SubscriberCoordinatesUpdateRequest,
  SubscriberFilters,
  CellResponse,
  CellFilters,
  WorkOrderResponse,
  WorkOrderCreateRequest,
  WorkOrderUpdateRequest,
  WorkOrderFilters,
  WorkOrderMaterialResponse,
  WorkOrderMaterialCreateRequest,
  WorkOrderMaterialUpdateRequest,
  CrewResponse,
  CrewCreateRequest,
  CrewUpdateRequest,
  CrewFilters,
  MaterialResponse,
  MaterialCreateRequest,
  MaterialUpdateRequest,
  MaterialFilters,
  LogResponse,
  LogFilters,
  DatabaseStatusResponse,
  DatabaseSchemaResponse,
  DatabaseTableInfo,
  DatabaseColumnInfo,
  DatabaseTableDataResponse,
  DatabaseQueryRequest,
  DatabaseConnectionInfoResponse,
  DatabaseExportSqlResponse,
  SseEvent,
  SubscriberUpdatedPayload,
  WorkOrderUpdatedPayload,
  DatabaseSwitchedPayload,
  GitStatusResponse,
  GitCommitInfo,
  GitInitRequest,
  GitRemoteRequest,
  MigrationInfo
} from './api';

// Utility types
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type ValueOf<T> = T[keyof T];
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];