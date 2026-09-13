/** Identifier used by every persisted CyberPingo entity. */
export type Id = string;

/** ISO-8601 timestamp, always serialized as a string over the REST API. */
export type IsoDateString = string;

/** Envelope returned by paginated list endpoints. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Normalized error payload returned by the API error middleware. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Payload returned by `GET /api/v1/health`. */
export interface HealthStatus {
  status: 'ok';
  service: string;
  version: string;
  uptime: number;
  timestamp: IsoDateString;
}
