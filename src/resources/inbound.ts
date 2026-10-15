import type { ClickMail } from "../client.js";
import type {
  InboundEmail,
  InboundEmailSummary,
  ListInboundParams,
  InboundRawResponse,
  InboundAttachmentDownload,
  ReplyInboundPayload,
} from "../../types/inbound.js";
import type { SendEmailResponse } from "../../types/emails.js";
import type { PaginatedResponse, RequestOptions } from "../../types/common.js";
import { ValidationError } from "../errors.js";
import { generateIdempotencyKey } from "../idempotency.js";

/**
 * Received emails. Reading requires an API key with the `inbound:read` scope;
 * replying requires `inbound:write`.
 */
export class InboundResource {
  constructor(private readonly client: ClickMail) {}

  async list(params?: ListInboundParams): Promise<PaginatedResponse<InboundEmailSummary>> {
    return this.client.request<PaginatedResponse<InboundEmailSummary>>({
      method: "GET",
      path: "/v1/inbound",
      query: params as Record<string, string | number | boolean | undefined>,
    });
  }

  async get(id: string): Promise<InboundEmail> {
    return this.client.request<InboundEmail>({
      method: "GET",
      path: `/v1/inbound/${id}`,
    });
  }

  /** Short-lived presigned URL to the raw MIME message. */
  async getRaw(id: string): Promise<InboundRawResponse> {
    return this.client.request<InboundRawResponse>({
      method: "GET",
      path: `/v1/inbound/${id}/raw`,
    });
  }

  /** Short-lived presigned URL to an attachment's content. */
  async getAttachment(id: string, attachmentId: string): Promise<InboundAttachmentDownload> {
    return this.client.request<InboundAttachmentDownload>({
      method: "GET",
      path: `/v1/inbound/${id}/attachments/${attachmentId}`,
    });
  }

  /**
   * Replies to a received email. It goes to the original Reply-To (or From)
   * and carries In-Reply-To/References so it threads in the recipient's client.
   */
  async reply(
    id: string,
    payload: ReplyInboundPayload,
    options?: RequestOptions
  ): Promise<SendEmailResponse> {
    if (!payload.from) {
      throw new ValidationError("'from' is required");
    }
    if (!payload.html && !payload.text) {
      throw new ValidationError("'html' or 'text' is required");
    }

    return this.client.request<SendEmailResponse>({
      method: "POST",
      path: `/v1/inbound/${id}/reply`,
      body: payload,
      idempotencyKey: options?.idempotencyKey ?? generateIdempotencyKey(),
    });
  }
}
