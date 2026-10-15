import { describe, it, expect, vi } from "vitest";
import { ClickMail } from "../src/client.js";
import {
  AuthenticationError,
  PermissionError,
  RateLimitError,
  ValidationError,
  QuotaExceededError,
  DomainNotVerifiedError,
  ApiError,
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

function makeMockFetchBody(body: unknown, status: number, statusText = "Error"): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    json: async () => body,
  }) as unknown as typeof fetch;
}

async function captureError(mockFetch: typeof fetch): Promise<unknown> {
  const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch, retries: 0 });
  try {
    await client.domains.list();
  } catch (err) {
    return err;
  }
  throw new Error("se esperaba un error");
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

describe("formatos de error de la API", () => {
  it("body default de NestJS con 401 mapea a AuthenticationError", async () => {
    const err = await captureError(
      makeMockFetchBody(
        { message: "Invalid API Key", error: "Unauthorized", statusCode: 401 },
        401,
        "Unauthorized"
      )
    );

    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err).toMatchObject({ statusCode: 401, code: "UNAUTHORIZED", message: "Invalid API Key" });
  });

  it("body default de NestJS con 403 y 429 mapea por status", async () => {
    const forbidden = await captureError(
      makeMockFetchBody({ message: "Forbidden resource", error: "Forbidden", statusCode: 403 }, 403)
    );
    expect(forbidden).toBeInstanceOf(PermissionError);

    const limited = await captureError(
      makeMockFetchBody({ message: "Too Many Requests", statusCode: 429 }, 429)
    );
    expect(limited).toBeInstanceOf(RateLimitError);
  });

  it("errores de ValidationPipe (message array) mapean a ValidationError", async () => {
    const err = await captureError(
      makeMockFetchBody(
        {
          message: ["to must be an array", "subject should not be empty"],
          error: "Bad Request",
          statusCode: 400,
        },
        400
      )
    );

    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toMatchObject({
      statusCode: 400,
      message: "to must be an array; subject should not be empty",
      details: { messages: ["to must be an array", "subject should not be empty"] },
    });
  });

  it("422 sin code mapea a ValidationError conservando el statusCode", async () => {
    const err = await captureError(
      makeMockFetchBody({ message: "Unprocessable", statusCode: 422 }, 422)
    );

    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ClickMailError).statusCode).toBe(422);
  });

  it("code en el nivel superior mapea a la clase tipada con el status real", async () => {
    const err = await captureError(
      makeMockFetchBody({ code: "QUOTA_EXCEEDED", message: "Monthly quota exceeded" }, 400)
    );

    expect(err).toBeInstanceOf(QuotaExceededError);
    expect(err).toMatchObject({
      statusCode: 400,
      code: "QUOTA_EXCEEDED",
      message: "Monthly quota exceeded",
    });
  });

  it("code desconocido en el nivel superior es ApiError con ese code", async () => {
    const err = await captureError(
      makeMockFetchBody({ code: "INVALID_SENDER", message: "Sender not allowed" }, 400)
    );

    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(ValidationError);
    expect(err).toMatchObject({ statusCode: 400, code: "INVALID_SENDER", message: "Sender not allowed" });
  });

  it("formato anidado { error: { code, message, details } } sigue funcionando", async () => {
    const err = await captureError(
      makeMockFetchBody(
        { error: { code: "DOMAIN_NOT_VERIFIED", message: "Domain not verified", details: { domain: "x.com" } } },
        400
      )
    );

    expect(err).toBeInstanceOf(DomainNotVerifiedError);
    expect(err).toMatchObject({ statusCode: 400, code: "DOMAIN_NOT_VERIFIED", details: { domain: "x.com" } });
  });

  it("status sin mapeo y body no JSON es ApiError con API_ERROR", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    }) as unknown as typeof fetch;

    const err = await captureError(mockFetch);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ statusCode: 404, code: "API_ERROR", message: "HTTP 404: Not Found" });
  });

  it("code tipado con status no reintentable no se reintenta", async () => {
    const mockFetch = makeMockFetchBody({ code: "QUOTA_EXCEEDED", message: "Quota exceeded" }, 400);
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch, retries: 2 });

    await expect(client.domains.list()).rejects.toThrow(QuotaExceededError);
    expect((mockFetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});
