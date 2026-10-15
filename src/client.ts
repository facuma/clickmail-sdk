import { errorFromResponse, ClickMailError, ValidationError } from "./errors.js";
import { EmailsResource } from "./resources/emails.js";
import { DomainsResource } from "./resources/domains.js";
import { SendersResource } from "./resources/senders.js";
import { WebhooksResource } from "./resources/webhooks.js";
import { TemplatesResource } from "./resources/templates.js";
import { CampaignsResource } from "./resources/campaigns.js";
import { ContactsResource } from "./resources/contacts.js";
import { SuppressionsResource } from "./resources/suppressions.js";
import { InboundResource } from "./resources/inbound.js";

const DEFAULT_BASE_URL = "https://resendapi.cubells.com.ar";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;
const SDK_VERSION = "0.4.0";

const RETRY_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const NO_RETRY_STATUS_CODES = new Set([400, 401, 403, 404, 422]);

export interface ClickMailConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
  fetch?: (url: string | URL | Request, init?: RequestInit) => Promise<Response>;
}

export interface InternalRequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  idempotencyKey?: string;
}

export class ClickMail {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly fetchImpl: (url: string | URL | Request, init?: RequestInit) => Promise<Response>;

  readonly emails: EmailsResource;
  readonly domains: DomainsResource;
  readonly senders: SendersResource;
  readonly webhooks: WebhooksResource;
  readonly templates: TemplatesResource;
  readonly campaigns: CampaignsResource;
  readonly contacts: ContactsResource;
  readonly suppressions: SuppressionsResource;
  readonly inbound: InboundResource;

  constructor(config: string | ClickMailConfig) {
    const fetchFn = (url: string | URL | Request, init?: RequestInit) =>
      fetch(url, init);

    if (typeof config === "string") {
      this.apiKey = config;
      this.baseUrl = DEFAULT_BASE_URL;
      this.timeoutMs = DEFAULT_TIMEOUT_MS;
      this.retries = DEFAULT_RETRIES;
      this.fetchImpl = fetchFn;
    } else {
      if (!config.apiKey) {
        throw new ValidationError("apiKey is required");
      }
      this.apiKey = config.apiKey;
      this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
      this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      this.retries = config.retries ?? DEFAULT_RETRIES;
      this.fetchImpl = config.fetch ?? fetchFn;
    }

    this.emails = new EmailsResource(this);
    this.domains = new DomainsResource(this);
    this.senders = new SendersResource(this);
    this.webhooks = new WebhooksResource(this);
    this.templates = new TemplatesResource(this);
    this.campaigns = new CampaignsResource(this);
    this.contacts = new ContactsResource(this);
    this.suppressions = new SuppressionsResource(this);
    this.inbound = new InboundResource(this);
  }

  async request<T>(opts: InternalRequestOptions): Promise<T> {
    const url = this.buildUrl(opts.path, opts.query);
    const headers = this.buildHeaders(opts.idempotencyKey);
    const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;

    // A POST is only safe to repeat when the server can de-duplicate it;
    // otherwise a 5xx/timeout after the server acted could send twice.
    const canRetry = opts.method !== "POST" || opts.idempotencyKey !== undefined;

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
        await sleep(delay);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const fetchInit: RequestInit = {
          method: opts.method,
          headers,
          signal: controller.signal,
        };
        if (body !== undefined) {
          fetchInit.body = body;
        }

        const response = await this.fetchImpl(url, fetchInit);

        clearTimeout(timer);
        return await this.handleResponse<T>(response);
      } catch (err) {
        clearTimeout(timer);

        if (err instanceof ClickMailError) {
          if (NO_RETRY_STATUS_CODES.has(err.statusCode)) {
            throw err;
          }
          if (!RETRY_STATUS_CODES.has(err.statusCode) || attempt >= this.retries) {
            throw err;
          }
          // 429 is always safe: the request was rejected before being processed.
          if (err.statusCode !== 429 && !canRetry) {
            throw err;
          }
          lastError = err;
          continue;
        }

        if (
          err instanceof Error &&
          (err.name === "AbortError" || err.message.includes("abort"))
        ) {
          lastError = new ClickMailError(
            `Request timed out after ${this.timeoutMs}ms`,
            408,
            "TIMEOUT"
          );
          if (attempt >= this.retries || !canRetry) throw lastError;
          continue;
        }

        throw err;
      }
    }

    throw lastError;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.ok) {
      if (response.status === 204) {
        return undefined as unknown as T;
      }
      const json = await safeJson(response);
      return json as T;
    }

    const json = await safeJson(response);
    throw errorFromResponse(response.status, response.statusText, json);
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private buildHeaders(idempotencyKey?: string): Record<string, string> {
    const nodeVersion =
      typeof process !== "undefined" ? process.versions?.node : undefined;
    const userAgent = nodeVersion
      ? `clickmail-sdk/${SDK_VERSION} node/${nodeVersion}`
      : `clickmail-sdk/${SDK_VERSION}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": userAgent,
    };

    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    return headers;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
