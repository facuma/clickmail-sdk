export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface RequestOptions {
  /**
   * Sent as `Idempotency-Key`. `emails.send` and `inbound.reply` generate a
   * random one when omitted, so automatic retries never send twice.
   */
  idempotencyKey?: string;
}
