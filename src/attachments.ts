import type { EmailAttachmentInput } from "../types/emails.js";

/** Wire shape: content is always base64. */
export interface SerializedAttachment {
  filename: string;
  content: string;
  contentType?: string;
  contentId?: string;
}

function toBase64(bytes: Uint8Array): string {
  const B = (globalThis as { Buffer?: { from(b: Uint8Array): { toString(enc: string): string } } }).Buffer;
  if (B) return B.from(bytes).toString("base64");
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export function serializeAttachments(
  attachments: EmailAttachmentInput[] | undefined
): SerializedAttachment[] | undefined {
  if (!attachments) return undefined;
  return attachments.map((att) => {
    const out: SerializedAttachment = {
      filename: att.filename,
      content: typeof att.content === "string" ? att.content : toBase64(att.content),
    };
    if (att.contentType !== undefined) out.contentType = att.contentType;
    if (att.contentId !== undefined) out.contentId = att.contentId;
    return out;
  });
}
