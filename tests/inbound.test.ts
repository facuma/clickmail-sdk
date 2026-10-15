import { describe, it, expect, vi } from "vitest";
import { ClickMail } from "../src/client.js";
import { ValidationError, ClickMailError } from "../src/errors.js";

type Call = [string, RequestInit];

function mockFetchOk(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status,
    json: async () => body,
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

function calls(mockFetch: unknown): Call[] {
  return (mockFetch as ReturnType<typeof vi.fn>).mock.calls as Call[];
}

describe("client.inbound", () => {
  it("list envía los filtros como query params", async () => {
    const mockFetch = mockFetchOk({ data: [], meta: { total: 0, page: 2, limit: 10, pages: 0 } });
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    await client.inbound.list({ status: "PROCESSED", to: "support@x.com", page: 2, limit: 10 });

    const url = new URL(calls(mockFetch)[0]![0]);
    expect(url.pathname).toBe("/v1/inbound");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      status: "PROCESSED",
      to: "support@x.com",
      page: "2",
      limit: "10",
    });
  });

  it("get, getRaw y getAttachment usan los endpoints correctos", async () => {
    const mockFetch = mockFetchOk({ url: "https://signed" });
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    await client.inbound.get("ie_1");
    await client.inbound.getRaw("ie_1");
    await client.inbound.getAttachment("ie_1", "att_1");

    const paths = calls(mockFetch).map(([u]) => new URL(u).pathname);
    expect(paths).toEqual([
      "/v1/inbound/ie_1",
      "/v1/inbound/ie_1/raw",
      "/v1/inbound/ie_1/attachments/att_1",
    ]);
  });

  it("reply hace POST con Idempotency-Key autogenerado", async () => {
    const mockFetch = mockFetchOk({ id: "em_out", status: "queued" }, 201);
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    const res = await client.inbound.reply("ie_1", {
      from: "Support <s@x.com>",
      text: "Ya lo vemos",
    });

    expect(res).toEqual({ id: "em_out", status: "queued" });
    const [url, init] = calls(mockFetch)[0]!;
    expect(new URL(url).pathname).toBe("/v1/inbound/ie_1/reply");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ from: "Support <s@x.com>", text: "Ya lo vemos" });
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toMatch(/.{16,}/);
  });

  it("reply respeta un idempotencyKey propio", async () => {
    const mockFetch = mockFetchOk({ id: "em_out", status: "queued" }, 201);
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    await client.inbound.reply("ie_1", { from: "s@x.com", html: "<p>Hola</p>" }, { idempotencyKey: "reply-ie_1" });

    const headers = calls(mockFetch)[0]![1].headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("reply-ie_1");
  });

  it("reply sin html ni text lanza ValidationError sin llamar a la API", async () => {
    const mockFetch = mockFetchOk({});
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    await expect(client.inbound.reply("ie_1", { from: "s@x.com" })).rejects.toThrow(ValidationError);
    expect(calls(mockFetch)).toHaveLength(0);
  });
});

describe("client.webhooks.deliveries", () => {
  it("list, get y redeliver usan los endpoints correctos", async () => {
    const mockFetch = mockFetchOk({});
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    await client.webhooks.deliveries.list({ status: "FAILED", eventType: "email.received" });
    await client.webhooks.deliveries.get("d_1");
    await client.webhooks.deliveries.redeliver("d_1");

    const [list, get, redeliver] = calls(mockFetch);
    const listUrl = new URL(list![0]);
    expect(listUrl.pathname).toBe("/v1/webhooks/deliveries");
    expect(listUrl.searchParams.get("status")).toBe("FAILED");
    expect(listUrl.searchParams.get("eventType")).toBe("email.received");
    expect(new URL(get![0]).pathname).toBe("/v1/webhooks/deliveries/d_1");
    expect(redeliver![1].method).toBe("POST");
    expect(new URL(redeliver![0]).pathname).toBe("/v1/webhooks/deliveries/d_1/redeliver");
  });
});

describe("reintentos e idempotencia", () => {
  function failingThenOk(status: number) {
    return vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status,
        statusText: "Error",
        json: async () => ({ error: { code: "SERVER_ERROR", message: "boom" } }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: "em_1", status: "queued" }) });
  }

  it("emails.send reintenta un 5xx con la misma Idempotency-Key", async () => {
    const mockFetch = failingThenOk(503) as unknown as typeof fetch;
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch, retries: 1 });

    await client.emails.send({ from: "a@x.com", to: ["b@x.com"], subject: "S", text: "T" });

    const keys = calls(mockFetch).map(([, init]) => (init.headers as Record<string, string>)["Idempotency-Key"]);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  it("un POST sin Idempotency-Key no se reintenta ante un 5xx", async () => {
    const mockFetch = failingThenOk(500) as unknown as typeof fetch;
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch, retries: 2 });

    await expect(client.webhooks.create({ url: "https://x.com/hook", events: ["*"] })).rejects.toThrow(
      ClickMailError
    );
    expect(calls(mockFetch)).toHaveLength(1);
  });

  it("un GET se sigue reintentando ante un 5xx", async () => {
    const mockFetch = failingThenOk(502) as unknown as typeof fetch;
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch, retries: 1 });

    await client.inbound.get("ie_1");
    expect(calls(mockFetch)).toHaveLength(2);
  });
});
