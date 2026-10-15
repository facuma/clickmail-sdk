import type { ClickMail } from "../client.js";
import type { Sender, CreateSenderPayload, UpdateSenderPayload } from "../../types/senders.js";

export class SendersResource {
  constructor(private readonly client: ClickMail) {}

  async create(payload: CreateSenderPayload): Promise<Sender> {
    return this.client.request<Sender>({
      method: "POST",
      path: "/v1/senders",
      body: payload,
    });
  }

  async list(): Promise<Sender[]> {
    return this.client.request<Sender[]>({
      method: "GET",
      path: "/v1/senders",
    });
  }

  async update(id: string, payload: UpdateSenderPayload): Promise<Sender> {
    return this.client.request<Sender>({
      method: "PATCH",
      path: `/v1/senders/${id}`,
      body: payload,
    });
  }

  /** Shorthand for `update(id, { active: false })`. */
  async disable(id: string): Promise<Sender> {
    return this.update(id, { active: false });
  }

  /** Shorthand for `update(id, { active: true })`. */
  async enable(id: string): Promise<Sender> {
    return this.update(id, { active: true });
  }
}
