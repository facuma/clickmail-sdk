import type { ClickMail } from "../client.js";
import type {
  Suppression,
  CreateSuppressionPayload,
  ListSuppressionsParams,
} from "../../types/suppressions.js";
import type { PaginatedResponse } from "../../types/common.js";

export class SuppressionsResource {
  constructor(private readonly client: ClickMail) {}

  async create(payload: CreateSuppressionPayload): Promise<Suppression> {
    return this.client.request<Suppression>({
      method: "POST",
      path: "/v1/suppressions",
      body: payload,
    });
  }

  async list(
    params?: ListSuppressionsParams
  ): Promise<PaginatedResponse<Suppression>> {
    return this.client.request<PaginatedResponse<Suppression>>({
      method: "GET",
      path: "/v1/suppressions",
      query: params as Record<string, string | number | boolean | undefined>,
    });
  }

  async delete(id: string): Promise<void> {
    return this.client.request<void>({
      method: "DELETE",
      path: `/v1/suppressions/${id}`,
    });
  }
}
