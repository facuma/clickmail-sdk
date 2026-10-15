import type { ClickMail } from "../client.js";
import type {
  Webhook,
  CreateWebhookPayload,
  UpdateWebhookPayload,
  WebhookDelivery,
  WebhookDeliverySummary,
  ListWebhookDeliveriesParams,
  RedeliverWebhookResponse,
} from "../../types/webhooks.js";
import type { PaginatedResponse } from "../../types/common.js";

/** Delivery log: every attempt to send an event to an endpoint. */
export class WebhookDeliveriesResource {
  constructor(private readonly client: ClickMail) {}

  async list(
    params?: ListWebhookDeliveriesParams
  ): Promise<PaginatedResponse<WebhookDeliverySummary>> {
    return this.client.request<PaginatedResponse<WebhookDeliverySummary>>({
      method: "GET",
      path: "/v1/webhooks/deliveries",
      query: params as Record<string, string | number | boolean | undefined>,
    });
  }

  async get(id: string): Promise<WebhookDelivery> {
    return this.client.request<WebhookDelivery>({
      method: "GET",
      path: `/v1/webhooks/deliveries/${id}`,
    });
  }

  /** Sends the same event (same id) again with a fresh retry schedule. */
  async redeliver(id: string): Promise<RedeliverWebhookResponse> {
    return this.client.request<RedeliverWebhookResponse>({
      method: "POST",
      path: `/v1/webhooks/deliveries/${id}/redeliver`,
    });
  }
}

export class WebhooksResource {
  readonly deliveries: WebhookDeliveriesResource;

  constructor(private readonly client: ClickMail) {
    this.deliveries = new WebhookDeliveriesResource(client);
  }

  async create(payload: CreateWebhookPayload): Promise<Webhook> {
    return this.client.request<Webhook>({
      method: "POST",
      path: "/v1/webhooks",
      body: payload,
    });
  }

  async list(): Promise<Webhook[]> {
    return this.client.request<Webhook[]>({
      method: "GET",
      path: "/v1/webhooks",
    });
  }

  async update(id: string, payload: UpdateWebhookPayload): Promise<Webhook> {
    return this.client.request<Webhook>({
      method: "PATCH",
      path: `/v1/webhooks/${id}`,
      body: payload,
    });
  }

  async delete(id: string): Promise<void> {
    return this.client.request<void>({
      method: "DELETE",
      path: `/v1/webhooks/${id}`,
    });
  }
}
