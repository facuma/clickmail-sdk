import type { PaginationParams } from "./common.js";

export interface InboundAddressRef {
  email: string;
  name: string | null;
}

/** Attachment as described in the `email.received` webhook payload. */
export interface InboundAttachmentRef {
  id: string;
  filename: string | null;
  content_type: string | null;
  content_disposition: string | null;
  size_bytes: number;
  content_id: string | null;
  checksum_sha256: string | null;
  /** false when the content was skipped (size/count limits) or could not be stored. */
  stored: boolean;
  /** API endpoint returning a short-lived download URL; null when `stored` is false. */
  download_url: string | null;
}

export type InboundEmailStatus =
  | "RECEIVED"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED"
  | "REJECTED";

export interface InboundAttachment {
  id: string;
  filename: string | null;
  contentType: string | null;
  contentDisposition: string | null;
  contentId: string | null;
  checksum: string | null;
  sizeBytes: number;
  stored: boolean;
  createdAt: string;
}

/** Inbound email as returned by `inbound.list` (no bodies). */
export interface InboundEmailSummary {
  id: string;
  projectId: string;
  domainId: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[] | null;
  subject: string | null;
  status: InboundEmailStatus;
  spamVerdict: string | null;
  virusVerdict: string | null;
  spfVerdict: string | null;
  dkimVerdict: string | null;
  dmarcVerdict: string | null;
  sizeBytes: number | null;
  read: boolean;
  receivedAt: string;
  createdAt: string;
  attachmentsCount: number;
}

/** Inbound email as returned by `inbound.get`. */
export interface InboundEmail extends Omit<InboundEmailSummary, "attachmentsCount"> {
  sesMessageId: string;
  messageIdHeader: string | null;
  replyToEmails: string[] | null;
  bccEmails: string[] | null;
  text: string | null;
  html: string | null;
  headers: Record<string, string> | null;
  addressId: string | null;
  failureReason: string | null;
  processedAt: string | null;
  updatedAt: string;
  attachments: InboundAttachment[];
}

export interface ListInboundParams extends PaginationParams {
  status?: InboundEmailStatus;
  from?: string;
  to?: string;
  subject?: string;
  /** ISO 8601 */
  dateFrom?: string;
  /** ISO 8601 */
  dateTo?: string;
}

export interface InboundRawResponse {
  /** Short-lived presigned URL to the raw MIME. */
  url: string;
}

export interface InboundAttachmentDownload {
  /** Short-lived presigned URL to the attachment content. */
  url: string;
  filename: string | null;
  contentType: string | null;
}

export interface ReplyInboundPayload {
  /** Must be an active verified sender: `user@domain.com` or `Name <user@domain.com>`. */
  from: string;
  /** Defaults to `Re: <original subject>`. */
  subject?: string;
  html?: string;
  text?: string;
}
