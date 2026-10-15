import { createHmac, timingSafeEqual } from "node:crypto";
import { ClickMailError } from "./errors.js";
import type { WebhookEventPayload } from "../types/webhooks.js";

// Re-exported so webhook handlers can catch what constructWebhookEvent throws.
export { ClickMailError } from "./errors.js";

export type {
  WebhookEventPayload,
  WebhookEventType,
  EmailWebhookEvent,
  EmailReceivedWebhookEvent,
  EmailEventData,
  EmailReceivedData,
} from "../types/webhooks.js";

/** Request headers as Node (`IncomingHttpHeaders`) or fetch (`Headers`) expose them. */
export type WebhookHeaders = Headers | Record<string, string | string[] | undefined>;

export interface VerifyWebhookOptions {
  /** The raw request body, exactly as received (never re-serialized JSON). */
  payload: string | Buffer | Uint8Array;
  /** `X-Webhook-Signature`. Optional when `headers` is given. */
  signature?: string;
  secret: string;
  /** Request headers; `X-Webhook-Signature` and `X-Webhook-Timestamp` are read from them. */
  headers?: WebhookHeaders;
  /**
   * Reject events whose timestamp is further than this many seconds from now.
   * Off by default. Retries keep the original timestamp and span ~2 hours, so
   * use a window that covers them (e.g. `3 * 60 * 60`) or de-duplicate on the
   * event `id` instead.
   */
  toleranceSeconds?: number;
}

function readHeader(headers: WebhookHeaders | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name) ?? undefined;
  }
  const record = headers as Record<string, string | string[] | undefined>;
  const key = Object.keys(record).find((k) => k.toLowerCase() === name);
  const value = key !== undefined ? record[key] : undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function verifyWebhookSignature(opts: VerifyWebhookOptions): boolean {
  const { payload, secret } = opts;
  const signature = opts.signature ?? readHeader(opts.headers, "x-webhook-signature");

  if (!signature || !secret) {
    return false;
  }

  try {
    const payloadBuffer =
      typeof payload === "string" ? Buffer.from(payload, "utf8") : Buffer.from(payload);

    const expected = createHmac("sha256", secret)
      .update(payloadBuffer)
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "hex");
    const receivedBuf = Buffer.from(
      signature.startsWith("sha256=") ? signature.slice(7) : signature,
      "hex"
    );

    if (expectedBuf.length !== receivedBuf.length) {
      return false;
    }

    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

export function constructWebhookEvent(opts: VerifyWebhookOptions): WebhookEventPayload {
  const valid = verifyWebhookSignature(opts);

  if (!valid) {
    throw new ClickMailError(
      "Invalid webhook signature. Ensure you are using the correct webhook secret.",
      400,
      "INVALID_WEBHOOK_SIGNATURE"
    );
  }

  const payloadString =
    typeof opts.payload === "string"
      ? opts.payload
      : Buffer.from(opts.payload).toString("utf8");

  let event: WebhookEventPayload;
  try {
    event = JSON.parse(payloadString) as WebhookEventPayload;
  } catch {
    throw new ClickMailError(
      "Webhook payload is not valid JSON.",
      400,
      "INVALID_WEBHOOK_PAYLOAD"
    );
  }

  if (opts.toleranceSeconds !== undefined) {
    // The timestamp is part of the signed body; the header mirrors it.
    const raw = readHeader(opts.headers, "x-webhook-timestamp") ?? event.timestamp;
    const ts = Date.parse(raw);
    if (Number.isNaN(ts) || Math.abs(Date.now() - ts) > opts.toleranceSeconds * 1000) {
      throw new ClickMailError(
        "Webhook timestamp is missing or outside the tolerance window.",
        400,
        "INVALID_WEBHOOK_TIMESTAMP"
      );
    }
  }

  return event;
}
