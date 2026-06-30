import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClickMail } from "../src/client.js";
import { ValidationError } from "../src/errors.js";

function mockFetchOk(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

describe("ClickMail constructor", () => {
  it("acepta string como API key", () => {
    const client = new ClickMail("ck_live_abc123");
    expect(client).toBeInstanceOf(ClickMail);
  });

  it("acepta objeto de configuración", () => {
    const client = new ClickMail({
      apiKey: "ck_live_abc123",
      baseUrl: "https://api.example.com",
      timeoutMs: 5000,
      retries: 1,
    });
    expect(client).toBeInstanceOf(ClickMail);
  });

  it("lanza ValidationError si apiKey está vacío", () => {
    expect(() => new ClickMail({ apiKey: "" })).toThrow(ValidationError);
  });

  it("expone todos los recursos", () => {
    const client = new ClickMail("ck_live_abc123");
    expect(client.emails).toBeDefined();
    expect(client.domains).toBeDefined();
    expect(client.senders).toBeDefined();
    expect(client.webhooks).toBeDefined();
    expect(client.templates).toBeDefined();
    expect(client.campaigns).toBeDefined();
    expect(client.contacts).toBeDefined();
    expect(client.suppressions).toBeDefined();
  });

  it("envía User-Agent correcto", async () => {
    const mockFetch = mockFetchOk({ id: "em_123", status: "queued" }, 201);
    const client = new ClickMail({ apiKey: "ck_live_abc123", fetch: mockFetch });

    await client.emails.send({
      from: "Sender <sender@example.com>",
      to: ["recipient@example.com"],
      subject: "Test",
      html: "<p>Hello</p>",
    });

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit
    ];
    const headers = init.headers as Record<string, string>;
    expect(headers["User-Agent"]).toMatch(/^clickmail-sdk\/0\.1\.0/);
  });

  it("envía Authorization header correcto", async () => {
    const mockFetch = mockFetchOk({ id: "em_123", status: "queued" }, 201);
    const client = new ClickMail({ apiKey: "ck_live_mykey", fetch: mockFetch });

    await client.emails.send({
      from: "a@example.com",
      to: ["b@example.com"],
      subject: "Hi",
      text: "Hello",
    });

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit
    ];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer ck_live_mykey");
  });
});
