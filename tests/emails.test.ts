import { describe, it, expect, vi } from "vitest";
import { ClickMail } from "../src/client.js";
import { ValidationError } from "../src/errors.js";

function makeMockFetch(
  body: unknown,
  status = 200,
  ok = true
): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: "OK",
    json: async () => body,
  }) as unknown as typeof fetch;
}

describe("emails.send", () => {
  it("hace POST a /v1/emails", async () => {
    const mockFetch = makeMockFetch({ id: "em_abc", status: "queued" }, 201);
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    const result = await client.emails.send({
      from: "sender@example.com",
      to: ["dest@example.com"],
      subject: "Hola",
      html: "<p>Mundo</p>",
    });

    expect(result.id).toBe("em_abc");
    expect(result.status).toBe("queued");

    const [url, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit
    ];
    expect(url).toContain("/v1/emails");
    expect(init.method).toBe("POST");
  });

  it("envía Idempotency-Key como header", async () => {
    const mockFetch = makeMockFetch({ id: "em_xyz", status: "queued" }, 201);
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    await client.emails.send({
      from: "sender@example.com",
      to: ["dest@example.com"],
      subject: "Test",
      html: "<p>Test</p>",
      idempotencyKey: "my-unique-key-123",
    });

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit
    ];
    const headers = init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("my-unique-key-123");
  });

  it("NO incluye idempotencyKey en el body", async () => {
    const mockFetch = makeMockFetch({ id: "em_xyz", status: "queued" }, 201);
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    await client.emails.send({
      from: "sender@example.com",
      to: ["dest@example.com"],
      subject: "Test",
      html: "<p>Test</p>",
      idempotencyKey: "unique-key",
    });

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit
    ];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty("idempotencyKey");
  });

  it("lanza ValidationError si falta 'from'", async () => {
    const client = new ClickMail("ck_live_test");
    await expect(
      client.emails.send({
        from: "",
        to: ["dest@example.com"],
        subject: "Test",
        html: "<p>Test</p>",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError si 'to' está vacío", async () => {
    const client = new ClickMail("ck_live_test");
    await expect(
      client.emails.send({
        from: "sender@example.com",
        to: [],
        subject: "Test",
        html: "<p>Test</p>",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError si falta subject sin templateId", async () => {
    const client = new ClickMail("ck_live_test");
    await expect(
      client.emails.send({
        from: "sender@example.com",
        to: ["dest@example.com"],
        html: "<p>Test</p>",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError si falta html y text sin templateId", async () => {
    const client = new ClickMail("ck_live_test");
    await expect(
      client.emails.send({
        from: "sender@example.com",
        to: ["dest@example.com"],
        subject: "Test",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("acepta templateId sin subject ni html", async () => {
    const mockFetch = makeMockFetch({ id: "em_tpl", status: "queued" }, 201);
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    const result = await client.emails.send({
      from: "sender@example.com",
      to: ["dest@example.com"],
      templateId: "tpl_welcome",
      variables: { name: "Juan" },
    });

    expect(result.status).toBe("queued");
  });
});

describe("emails.get", () => {
  it("hace GET a /v1/emails/:id", async () => {
    const mockFetch = makeMockFetch({ id: "em_abc", status: "delivered" });
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    const result = await client.emails.get("em_abc");
    expect(result.id).toBe("em_abc");

    const [url] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("/v1/emails/em_abc");
  });
});
