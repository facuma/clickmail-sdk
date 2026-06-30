import { describe, it, expect, vi } from "vitest";
import { ClickMail } from "../src/client.js";
import {
  AuthenticationError,
  PermissionError,
  RateLimitError,
  ClickMailError,
} from "../src/errors.js";

function makeMockFetchError(
  errorCode: string,
  message: string,
  status: number
): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: "Error",
    json: async () => ({
      error: { code: errorCode, message },
    }),
  }) as unknown as typeof fetch;
}

function makeMockFetchOk(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

describe("manejo de errores HTTP", () => {
  it("401 UNAUTHORIZED mapea a AuthenticationError", async () => {
    const mockFetch = makeMockFetchError("UNAUTHORIZED", "Invalid API Key", 401);
    const client = new ClickMail({ apiKey: "bad_key", fetch: mockFetch, retries: 0 });

    await expect(
      client.emails.send({
        from: "a@b.com",
        to: ["c@d.com"],
        subject: "Test",
        html: "<p>Hi</p>",
      })
    ).rejects.toThrow(AuthenticationError);
  });

  it("403 FORBIDDEN mapea a PermissionError", async () => {
    const mockFetch = makeMockFetchError("FORBIDDEN", "Forbidden", 403);
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch, retries: 0 });

    await expect(client.domains.list()).rejects.toThrow(PermissionError);
  });

  it("429 RATE_LIMIT_EXCEEDED mapea a RateLimitError", async () => {
    const mockFetch = makeMockFetchError(
      "RATE_LIMIT_EXCEEDED",
      "Too many requests",
      429
    );
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch, retries: 0 });

    await expect(client.domains.list()).rejects.toThrow(RateLimitError);
  });

  it("500 hace retry y eventualmente lanza ClickMailError", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ error: { code: "SERVER_ERROR", message: "Internal error" } }),
    }) as unknown as typeof fetch;

    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch, retries: 2, timeoutMs: 5000 });

    await expect(client.domains.list()).rejects.toThrow(ClickMailError);

    expect((mockFetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(3);
  }, 15000);

  it("400 NO hace retry", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        error: { code: "VALIDATION_ERROR", message: "Invalid input" },
      }),
    }) as unknown as typeof fetch;

    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch, retries: 2 });

    await expect(client.domains.list()).rejects.toThrow(ClickMailError);

    expect((mockFetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("el mensaje de error no expone la API key", async () => {
    const apiKey = "ck_live_supersecretkey123";
    const mockFetch = makeMockFetchError("UNAUTHORIZED", "Invalid API Key", 401);
    const client = new ClickMail({ apiKey, fetch: mockFetch, retries: 0 });

    let errorMessage = "";
    try {
      await client.domains.list();
    } catch (err) {
      if (err instanceof Error) {
        errorMessage = err.message;
      }
    }

    expect(errorMessage).not.toContain(apiKey);
  });
});
