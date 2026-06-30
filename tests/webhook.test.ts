import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  verifyWebhookSignature,
  constructWebhookEvent,
} from "../src/webhook.js";
import { ClickMailError } from "../src/errors.js";

const SECRET = "whsec_testingsecretkey123456";
const PAYLOAD = JSON.stringify({
  type: "email.delivered",
  project_id: "proj_abc",
  timestamp: "2024-01-01T00:00:00Z",
  data: {
    email_id: "em_abc",
    ses_message_id: "ses_123",
    status: "delivered",
    recipients: ["user@example.com"],
  },
});

function makeSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

describe("verifyWebhookSignature", () => {
  it("devuelve true si la firma es válida", () => {
    const signature = makeSignature(PAYLOAD, SECRET);
    expect(verifyWebhookSignature({ payload: PAYLOAD, signature, secret: SECRET })).toBe(true);
  });

  it("devuelve false si la firma es inválida", () => {
    expect(
      verifyWebhookSignature({
        payload: PAYLOAD,
        signature: "invalidsignature",
        secret: SECRET,
      })
    ).toBe(false);
  });

  it("devuelve false si el secret es incorrecto", () => {
    const signature = makeSignature(PAYLOAD, "wrong_secret");
    expect(
      verifyWebhookSignature({ payload: PAYLOAD, signature, secret: SECRET })
    ).toBe(false);
  });

  it("acepta Buffer como payload", () => {
    const buf = Buffer.from(PAYLOAD, "utf8");
    const signature = makeSignature(PAYLOAD, SECRET);
    expect(verifyWebhookSignature({ payload: buf, signature, secret: SECRET })).toBe(true);
  });

  it("acepta Uint8Array como payload", () => {
    const buf = new TextEncoder().encode(PAYLOAD);
    const signature = makeSignature(PAYLOAD, SECRET);
    expect(verifyWebhookSignature({ payload: buf, signature, secret: SECRET })).toBe(true);
  });

  it("acepta signature con prefijo sha256=", () => {
    const sig = "sha256=" + makeSignature(PAYLOAD, SECRET);
    expect(verifyWebhookSignature({ payload: PAYLOAD, signature: sig, secret: SECRET })).toBe(true);
  });
});

describe("constructWebhookEvent", () => {
  it("retorna el evento parseado si la firma es válida", () => {
    const signature = makeSignature(PAYLOAD, SECRET);
    const event = constructWebhookEvent({ payload: PAYLOAD, signature, secret: SECRET });

    expect(event.type).toBe("email.delivered");
    expect(event.project_id).toBe("proj_abc");
    expect(event.data.email_id).toBe("em_abc");
  });

  it("lanza ClickMailError si la firma es inválida", () => {
    expect(() =>
      constructWebhookEvent({
        payload: PAYLOAD,
        signature: "badsignature",
        secret: SECRET,
      })
    ).toThrow(ClickMailError);
  });

  it("lanza ClickMailError con código INVALID_WEBHOOK_SIGNATURE", () => {
    try {
      constructWebhookEvent({
        payload: PAYLOAD,
        signature: "badsignature",
        secret: SECRET,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ClickMailError);
      expect((err as ClickMailError).code).toBe("INVALID_WEBHOOK_SIGNATURE");
    }
  });

  it("lanza ClickMailError si el payload no es JSON válido", () => {
    const badPayload = "not-json";
    const signature = makeSignature(badPayload, SECRET);

    expect(() =>
      constructWebhookEvent({ payload: badPayload, signature, secret: SECRET })
    ).toThrow(ClickMailError);
  });
});
