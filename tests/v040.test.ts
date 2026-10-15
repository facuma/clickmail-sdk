import { describe, it, expect, vi } from "vitest";
import { ClickMail } from "../src/client.js";
import { ApiError } from "../src/errors.js";

type Call = [string, RequestInit];

function mockFetchOk(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({ ok: true, status, json: async () => body }) as unknown as typeof fetch;
}

function calls(mockFetch: unknown): Call[] {
  return (mockFetch as ReturnType<typeof vi.fn>).mock.calls as Call[];
}

function body(call: Call | undefined): any {
  return JSON.parse(call![1].body as string);
}

describe("client.inbound.addresses", () => {
  it("create, list, update, disable y delete usan los endpoints correctos", async () => {
    const mockFetch = mockFetchOk({ id: "addr_1" });
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    await client.inbound.addresses.create({ localPart: "mandato-42", host: "inbound.acme.com" });
    await client.inbound.addresses.list({ active: true, host: "inbound.acme.com" });
    await client.inbound.addresses.get("addr_1");
    await client.inbound.addresses.update("addr_1", { name: "Mandato 42" });
    await client.inbound.addresses.disable("addr_1");
    await client.inbound.addresses.delete("addr_1");

    const c = calls(mockFetch);
    expect(c.map(([u, i]) => `${i.method} ${new URL(u).pathname}`)).toEqual([
      "POST /v1/inbound/addresses",
      "GET /v1/inbound/addresses",
      "GET /v1/inbound/addresses/addr_1",
      "PATCH /v1/inbound/addresses/addr_1",
      "PATCH /v1/inbound/addresses/addr_1",
      "DELETE /v1/inbound/addresses/addr_1",
    ]);
    expect(body(c[0])).toEqual({ localPart: "mandato-42", host: "inbound.acme.com" });
    expect(new URL(c[1]![0]).searchParams.get("active")).toBe("true");
    expect(body(c[4])).toEqual({ active: false });
  });
});

describe("client.senders.update", () => {
  it("disable y enable envían PATCH con active", async () => {
    const mockFetch = mockFetchOk({ id: "snd_1", status: "disabled" });
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    await client.senders.disable("snd_1");
    await client.senders.enable("snd_1");

    const c = calls(mockFetch);
    expect(c[0]![1].method).toBe("PATCH");
    expect(new URL(c[0]![0]).pathname).toBe("/v1/senders/snd_1");
    expect(body(c[0])).toEqual({ active: false });
    expect(body(c[1])).toEqual({ active: true });
  });

  it("un remitente deshabilitado llega como ApiError con code SENDER_DISABLED", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: async () => ({ code: "SENDER_DISABLED", message: "Sender is disabled" }),
    }) as unknown as typeof fetch;
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch, retries: 0 });

    const err = await client.emails
      .send({ from: "t@acme.com", to: ["a@x.com"], subject: "S", text: "T" })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("SENDER_DISABLED");
    expect((err as ApiError).statusCode).toBe(403);
  });
});

describe("client.domains inbound", () => {
  it("enableInbound y disableInbound", async () => {
    const mockFetch = mockFetchOk({ id: "dom_1", inboundEnabled: true });
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });
    await client.domains.enableInbound("dom_1");
    await client.domains.disableInbound("dom_1");
    expect(calls(mockFetch).map(([u]) => new URL(u).pathname)).toEqual([
      "/v1/domains/dom_1/inbound/enable",
      "/v1/domains/dom_1/inbound/disable",
    ]);
  });
});

describe("adjuntos e hilos", () => {
  it("emails.send codifica Buffer en base64 y deja strings como están", async () => {
    const mockFetch = mockFetchOk({ id: "em_1", status: "queued" }, 201);
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    await client.emails.send({
      from: "t@acme.com",
      to: ["a@x.com"],
      subject: "Comprobante",
      text: "Adjunto",
      attachments: [
        { filename: "comprobante.pdf", content: Buffer.from("%PDF-1.4") },
        { filename: "logo.png", content: "iVBORw0KGgo=", contentId: "logo" },
      ],
      inReplyToEmailId: "em_0",
    });

    const sent = body(calls(mockFetch)[0]);
    expect(sent.attachments).toEqual([
      { filename: "comprobante.pdf", content: Buffer.from("%PDF-1.4").toString("base64") },
      { filename: "logo.png", content: "iVBORw0KGgo=", contentId: "logo" },
    ]);
    expect(sent.inReplyToEmailId).toBe("em_0");
  });

  it("emails.send sin adjuntos no manda el campo", async () => {
    const mockFetch = mockFetchOk({ id: "em_1", status: "queued" }, 201);
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });
    await client.emails.send({ from: "t@acme.com", to: ["a@x.com"], subject: "S", text: "T" });
    expect(body(calls(mockFetch)[0])).not.toHaveProperty("attachments");
  });

  it("inbound.reply acepta replyAll, cc, bcc y adjuntos", async () => {
    const mockFetch = mockFetchOk({ id: "em_2", status: "queued" }, 201);
    const client = new ClickMail({ apiKey: "ck_live_test", fetch: mockFetch });

    await client.inbound.reply("ie_1", {
      from: "t@acme.com",
      text: "Va el comprobante",
      replyAll: true,
      cc: ["contador@x.com"],
      bcc: ["archivo@acme.com"],
      attachments: [{ filename: "recibo.pdf", content: new Uint8Array([37, 80, 68, 70]) }],
    });

    expect(body(calls(mockFetch)[0])).toEqual({
      from: "t@acme.com",
      text: "Va el comprobante",
      replyAll: true,
      cc: ["contador@x.com"],
      bcc: ["archivo@acme.com"],
      attachments: [{ filename: "recibo.pdf", content: "JVBERg==" }],
    });
  });
});
