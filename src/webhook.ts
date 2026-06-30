import { createHmac, timingSafeEqual } from "node:crypto";
import { ClickMailError } from "./errors.js";
import type { WebhookEventPayload } from "../types/webhooks.js";

export type { WebhookEventPayload, WebhookEventType } from "../types/webhooks.js";

export interface VerifyWebhookOptions {
  payload: string | Buffer | Uint8Array;
  signature: string;
  secret: string;
}

export function verifyWebhookSignature(opts: VerifyWebhookOptions): boolean {
  const { payload, signature, secret } = opts;

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

  try {
    return JSON.parse(payloadString) as WebhookEventPayload;
  } catch {
    throw new ClickMailError(
      "Webhook payload is not valid JSON.",
      400,
      "INVALID_WEBHOOK_PAYLOAD"
    );
  }
}
