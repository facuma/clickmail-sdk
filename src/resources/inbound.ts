import type { ClickMail } from "../client.js";
import type {
  InboundEmail,
  InboundEmailSummary,
  ListInboundParams,
  InboundRawResponse,
  InboundAttachmentDownload,
  ReplyInboundPayload,
  InboundAddress,
  CreateInboundAddressPayload,
  UpdateInboundAddressPayload,
  ListInboundAddressesParams,
} from "../../types/inbound.js";
import type { SendEmailResponse } from "../../types/emails.js";
import type { PaginatedResponse, RequestOptions } from "../../types/common.js";
import { ValidationError } from "../errors.js";
import { generateIdempotencyKey } from "../idempotency.js";
import { serializeAttachments } from "../attachments.js";

/**
 * Received emails. Reading requires an API key with the `inbound:read` scope;
 * replying requires `inbound:write`.
 */
/** Receiving addresses (mailboxes) and their routing rules. */
export class InboundAddressesResource {
  constructor(private readonly client: ClickMail) {}

  /** Requires `inbound:read`. */
  async list(params?: ListInboundAddressesParams): Promise<InboundAddress[]> {
    return this.client.request<InboundAddress[]>({
      method: "GET",
      path: "/v1/inbound/addresses",
      query: params as Record<string, string | number | boolean | undefined>,
    });
  }

  /** Requires `inbound:read`. */
  async get(id: string): Promise<InboundAddress> {
    return this.client.request<InboundAddress>({
      method: "GET",
      path: `/v1/inbound/addresses/${id}`,
    });
  }

  /** Requires `inbound:write`. The host must be covered by an inbound-enabled domain. */
  async create(payload: CreateInboundAddressPayload): Promise<InboundAddress> {
    return this.client.request<InboundAddress>({
      method: "POST",
      path: "/v1/inbound/addresses",
      body: payload,
    });
  }

  /** Requires `inbound:write`. Use `{ active: false }` to stop receiving but keep history. */
  async update(id: string, payload: UpdateInboundAddressPayload): Promise<InboundAddress> {
    return this.client.request<InboundAddress>({
      method: "PATCH",
      path: `/v1/inbound/addresses/${id}`,
      body: payload,
    });
  }

  /** Shorthand for `update(id, { active: false })`. */
  async disable(id: string): Promise<InboundAddress> {
    return this.update(id, { active: false });
  }

  /** Requires `inbound:write`. Received emails are kept. */
  async delete(id: string): Promise<{ id: string; deleted: true }> {
    return this.client.request<{ id: string; deleted: true }>({
      method: "DELETE",
      path: `/v1/inbound/addresses/${id}`,
    });
  }
}

export class InboundResource {
  readonly addresses: InboundAddressesResource;

  constructor(private readonly client: ClickMail) {
    this.addresses = new InboundAddressesResource(client);
  }

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

    const { attachments, ...rest } = payload;
    const serialized = serializeAttachments(attachments);

    return this.client.request<SendEmailResponse>({
      method: "POST",
      path: `/v1/inbound/${id}/reply`,
      body: serialized ? { ...rest, attachments: serialized } : rest,
      idempotencyKey: options?.idempotencyKey ?? generateIdempotencyKey(),
    });
  }
}
