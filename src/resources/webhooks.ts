import type { ClickMail } from "../client.js";
import type {
  Webhook,
  CreateWebhookPayload,
  UpdateWebhookPayload,
} from "../../types/webhooks.js";

export class WebhooksResource {
  constructor(private readonly client: ClickMail) {}

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
