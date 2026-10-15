import type { ClickMail } from "../client.js";
import type { Domain, CreateDomainPayload, DomainInboundStatus } from "../../types/domains.js";

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

  /** Enables receiving email for a verified domain. Requires the `inbound:write` scope. */
  async enableInbound(id: string): Promise<DomainInboundStatus> {
    return this.client.request<DomainInboundStatus>({
      method: "POST",
      path: `/v1/domains/${id}/inbound/enable`,
    });
  }

  /** Stops receiving email for the domain. Requires the `inbound:write` scope. */
  async disableInbound(id: string): Promise<DomainInboundStatus> {
    return this.client.request<DomainInboundStatus>({
      method: "POST",
      path: `/v1/domains/${id}/inbound/disable`,
    });
  }
}
