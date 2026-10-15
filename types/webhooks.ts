import type { PaginationParams } from "./common.js";
import type { InboundAddressRef, InboundAttachmentRef } from "./inbound.js";

/** Outbound email lifecycle events. */
export type EmailWebhookEventType =
  | "email.sent"
  | "email.delivered"
  | "email.bounced"
  | "email.complained"
  | "email.failed"
  | "email.opened"
  | "email.clicked";

/** Accepted in subscriptions but not emitted yet. */
export type ReservedWebhookEventType =
  | "project.suspended"
  | "usage.quota_exceeded"
  | "abuse.signal_created";

export type WebhookEventType =
  | EmailWebhookEventType
  | "email.received"
  | ReservedWebhookEventType
  | "*";

export interface Webhook {
  id: string;
  projectId: string;
  url: string;
  events: WebhookEventType[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookPayload {
  url: string;
  events: WebhookEventType[];
  active?: boolean;
}

export interface UpdateWebhookPayload {
  url?: string;
  events?: WebhookEventType[];
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Event payloads (what your endpoint receives)
// ---------------------------------------------------------------------------

/** `data` of the outbound email lifecycle events. */
export interface EmailEventData {
  email_id: string;
  ses_message_id?: string;
  status: string;
  recipients?: string[];
  /** Bounce sub-type, complaint type or send error, when relevant. */
  error?: string | null;
}

/** `data` of `email.received`. */
export interface EmailReceivedData {
  /** Inbound email id — use it with `client.inbound.get(id)`. */
  id: string;
  project_id: string;
  from: InboundAddressRef;
  to: InboundAddressRef[];
  cc: InboundAddressRef[];
  reply_to: InboundAddressRef[];
  subject: string | null;
  text: string | null;
  html: string | null;
  /** RFC 5322 Message-ID of the received email. */
  message_id: string | null;
  /** Message-ID this email replies to (e.g. one you sent), if any. */
  in_reply_to: string | null;
  references: string[];
  received_at: string;
  spam_verdict: string | null;
  virus_verdict: string | null;
  spf_verdict: string | null;
  dkim_verdict: string | null;
  dmarc_verdict: string | null;
  attachments: InboundAttachmentRef[];
}

interface WebhookEventBase<T extends string, D> {
  /** Event id, stable across retries (also sent as `X-Webhook-Id`). De-duplicate on it. */
  id: string;
  type: T;
  project_id: string;
  /** ISO timestamp of when the event was created. */
  timestamp: string;
  data: D;
}

export type EmailWebhookEvent = WebhookEventBase<EmailWebhookEventType, EmailEventData>;
export type EmailReceivedWebhookEvent = WebhookEventBase<"email.received", EmailReceivedData>;
export type ReservedWebhookEvent = WebhookEventBase<
  ReservedWebhookEventType,
  Record<string, unknown>
>;

/** Discriminated union: narrow it with `switch (event.type)`. */
export type WebhookEventPayload =
  | EmailWebhookEvent
  | EmailReceivedWebhookEvent
  | ReservedWebhookEvent;

// ---------------------------------------------------------------------------
// Delivery log
// ---------------------------------------------------------------------------

export type WebhookDeliveryStatus = "PENDING" | "SUCCEEDED" | "FAILED";

export interface WebhookDeliverySummary {
  /** Same as the event id in the payload. */
  id: string;
  endpointId: string | null;
  /** Set when the delivery targets an inbound address forward webhook. */
  inboundAddressId: string | null;
  url: string;
  eventType: string;
  status: WebhookDeliveryStatus;
  attempts: number;
  responseStatus: number | null;
  lastError: string | null;
  durationMs: number | null;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface WebhookDelivery extends WebhookDeliverySummary {
  projectId: string;
  /** The exact envelope that is signed and sent. */
  payload: WebhookEventPayload;
  /** Truncated response body of the last attempt. */
  responseBody: string | null;
  updatedAt: string;
}

export interface ListWebhookDeliveriesParams extends PaginationParams {
  status?: WebhookDeliveryStatus;
  eventType?: string;
  endpointId?: string;
}

export interface RedeliverWebhookResponse {
  id: string;
  status: "PENDING";
}
