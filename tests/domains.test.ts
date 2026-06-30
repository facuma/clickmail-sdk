import { describe, it, expect, vi } from "vitest";
import { ClickMail } from "../src/client.js";

function makeMockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

describe("domains.create", () => {
  it("hace POST a /v1/domains", async () => {
    const domainResponse = {
      id: "dom_abc",
      domain: "example.com",
      status: "pending",
      dkimRecords: [],
      mailFromRecords: [],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };
    const mockFetch = makeMockFetch(domainResponse, 201);
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    const result = await client.domains.create({ domain: "example.com" });

    expect(result.id).toBe("dom_abc");
    expect(result.status).toBe("pending");

    const [url, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit
    ];
    expect(url).toContain("/v1/domains");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.domain).toBe("example.com");
  });
});

describe("domains.list", () => {
  it("hace GET a /v1/domains", async () => {
    const mockFetch = makeMockFetch([]);
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    const result = await client.domains.list();
    expect(Array.isArray(result)).toBe(true);

    const [url, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit
    ];
    expect(url).toContain("/v1/domains");
    expect(init.method).toBe("GET");
  });
});

describe("domains.check", () => {
  it("hace POST a /v1/domains/:id/check", async () => {
    const mockFetch = makeMockFetch({ id: "dom_abc", status: "verified" });
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    await client.domains.check("dom_abc");

    const [url, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit
    ];
    expect(url).toContain("/v1/domains/dom_abc/check");
    expect(init.method).toBe("POST");
  });
});
