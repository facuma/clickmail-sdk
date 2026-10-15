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

export interface SendEmailPayload {
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
  /** Defaults to a random key per call, so automatic retries never send twice. */
  idempotencyKey?: string;
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
  error?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ListEmailsParams extends PaginationParams {
  status?: EmailStatus;
}
