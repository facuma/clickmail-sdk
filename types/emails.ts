import type { PaginationParams } from "./common.js";

export type EmailStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "suppressed";

export interface EmailAttachmentInput {
  filename: string;
  /** File bytes (`Buffer`/`Uint8Array`) or an already base64-encoded string. */
  content: string | Uint8Array;
  /** Defaults to a type inferred from the filename extension. */
  contentType?: string;
  /** Embed inline and reference it from the HTML as `cid:<contentId>`. */
  contentId?: string;
}

/** Threading options shared by sends. */
export interface ThreadingOptions {
  /** Id of an email sent through ClickMail to reply to (sets In-Reply-To/References). */
  inReplyToEmailId?: string;
  /** Raw RFC 5322 Message-ID to reply to, e.g. `<abc@example.com>`. */
  inReplyTo?: string;
  /** Message-IDs of the thread, oldest first. */
  references?: string[];
}

export interface SendEmailPayload extends ThreadingOptions {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  subject?: string;
  html?: string;
  text?: string;
  templateId?: string;
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  /** Up to 10 files, ~28 MB in total. Some executable types are rejected. */
  attachments?: EmailAttachmentInput[];
  /** Defaults to a random key per call, so automatic retries never send twice. */
  idempotencyKey?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  contentId: string | null;
  sizeBytes: number;
  createdAt: string;
}

export interface SendEmailResponse {
  id: string;
  status: "queued";
}

export interface Email {
  id: string;
  projectId: string;
  fromEmail: string;
  fromName: string;
  toEmails: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  replyToEmails?: string[];
  subject: string;
  html: string;
  text: string;
  status: EmailStatus;
  sesMessageId?: string;
  /**
   * RFC 5322 Message-ID of the sent email (set once sent). Replies to it carry
   * this value in In-Reply-To; inbound emails replying to it are linked via
   * `inReplyToEmailId`.
   */
  messageIdHeader?: string | null;
  attachments?: EmailAttachment[];
  error?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ListEmailsParams extends PaginationParams {
  status?: EmailStatus;
}
