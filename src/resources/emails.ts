import type { ClickMail } from "../client.js";
import type {
  SendEmailPayload,
  SendEmailResponse,
  Email,
  ListEmailsParams,
} from "../../types/emails.js";
import type { PaginatedResponse } from "../../types/common.js";
import { ValidationError } from "../errors.js";
import { generateIdempotencyKey } from "../idempotency.js";
import { serializeAttachments } from "../attachments.js";

export class EmailsResource {
  constructor(private readonly client: ClickMail) {}

  async send(payload: SendEmailPayload): Promise<SendEmailResponse> {
    this.validate(payload);

    const { idempotencyKey, attachments, ...rest } = payload;
    const serialized = serializeAttachments(attachments);
    const body = serialized ? { ...rest, attachments: serialized } : rest;

    return this.client.request<SendEmailResponse>({
      method: "POST",
      path: "/v1/emails",
      body,
      // Always sent so automatic retries can never send the email twice.
      idempotencyKey: idempotencyKey ?? generateIdempotencyKey(),
    });
  }

  async get(id: string): Promise<Email> {
    return this.client.request<Email>({
      method: "GET",
      path: `/v1/emails/${id}`,
    });
  }

  async list(params?: ListEmailsParams): Promise<PaginatedResponse<Email>> {
    return this.client.request<PaginatedResponse<Email>>({
      method: "GET",
      path: "/v1/emails",
      query: params as Record<string, string | number | boolean | undefined>,
    });
  }

  private validate(payload: SendEmailPayload): void {
    if (!payload.from) {
      throw new ValidationError("'from' is required");
    }
    if (!payload.to || payload.to.length === 0) {
      throw new ValidationError("At least one recipient in 'to' is required");
    }
    if (!payload.templateId) {
      if (!payload.subject) {
        throw new ValidationError("'subject' is required when not using a template");
      }
      if (!payload.html && !payload.text) {
        throw new ValidationError("'html' or 'text' is required when not using a template");
      }
    }
  }
}
