import type { PaginationParams } from "./common.js";

export type SuppressionReason = "bounce" | "complaint" | "unsubscribe" | "manual";

export interface Suppression {
  id: string;
  email: string;
  reason: SuppressionReason;
  source: string;
  createdAt: string;
}

export interface CreateSuppressionPayload {
  email: string;
  reason: SuppressionReason;
}

export interface ListSuppressionsParams extends PaginationParams {
  reason?: SuppressionReason;
}
