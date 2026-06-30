import type { ClickMail } from "../client.js";
import type { Domain, CreateDomainPayload } from "../../types/domains.js";

export class DomainsResource {
  constructor(private readonly client: ClickMail) {}

  async create(payload: CreateDomainPayload): Promise<Domain> {
    return this.client.request<Domain>({
      method: "POST",
      path: "/v1/domains",
      body: payload,
    });
  }

  async list(): Promise<Domain[]> {
    return this.client.request<Domain[]>({
      method: "GET",
      path: "/v1/domains",
    });
  }

  async get(id: string): Promise<Domain> {
    return this.client.request<Domain>({
      method: "GET",
      path: `/v1/domains/${id}`,
    });
  }

  async check(id: string): Promise<Domain> {
    return this.client.request<Domain>({
      method: "POST",
      path: `/v1/domains/${id}/check`,
    });
  }
}
