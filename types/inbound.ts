import type { PaginationParams } from "./common.js";
import type { EmailAttachmentInput } from "./emails.js";

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

export interface InboundEmailThreadInfo {
  /** Id of the email you sent through ClickMail that this one replies to, if any. */
  inReplyToEmailId: string | null;
}

/** Inbound email as returned by `inbound.get`. */
export interface InboundEmail
  extends Omit<InboundEmailSummary, "attachmentsCount">,
    InboundEmailThreadInfo {
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
  /** Also copy the original To/Cc, minus your own inbound addresses and the sender. */
  replyAll?: boolean;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachmentInput[];
}

// ---------------------------------------------------------------------------
// Inbound addresses (mailboxes + routing rules)
// ---------------------------------------------------------------------------

export interface InboundAddress {
  id: string;
  projectId: string;
  domainId: string;
  /** Full lowercase address; `*@host` for a catch-all. */
  address: string;
  localPart: string;
  host: string;
  name: string | null;
  isCatchAll: boolean;
  /** Inactive addresses drop incoming mail. */
  active: boolean;
  deliverToInbox: boolean;
  forwardWebhookUrl: string | null;
  /** Signing secret of `forwardWebhookUrl` deliveries. */
  forwardWebhookSecret: string | null;
  forwardEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInboundAddressPayload {
  /** Mailbox local part (`soporte`), or `*` for a catch-all. */
  localPart: string;
  /** Recipient host, covered by an inbound-enabled domain of the project. */
  host: string;
  name?: string;
  isCatchAll?: boolean;
  active?: boolean;
  deliverToInbox?: boolean;
  forwardWebhookUrl?: string;
  forwardEmail?: string;
}

export interface UpdateInboundAddressPayload {
  name?: string;
  active?: boolean;
  deliverToInbox?: boolean;
  forwardWebhookUrl?: string;
  clearForwardWebhook?: boolean;
  forwardEmail?: string;
  clearForwardEmail?: boolean;
}

export interface ListInboundAddressesParams {
  active?: boolean;
  host?: string;
}
