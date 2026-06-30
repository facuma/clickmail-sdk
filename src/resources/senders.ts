import type { ClickMail } from "../client.js";
import type { Sender, CreateSenderPayload } from "../../types/senders.js";

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
}
