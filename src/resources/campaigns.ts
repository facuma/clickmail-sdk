import type { ClickMail } from "../client.js";
import type {
  Campaign,
  CreateCampaignPayload,
  ListCampaignsParams,
} from "../../types/campaigns.js";
import type { PaginatedResponse } from "../../types/common.js";

export class CampaignsResource {
  constructor(private readonly client: ClickMail) {}

  async create(payload: CreateCampaignPayload): Promise<Campaign> {
    return this.client.request<Campaign>({
      method: "POST",
      path: "/v1/campaigns",
      body: payload,
    });
  }

  async list(
    params?: ListCampaignsParams
  ): Promise<PaginatedResponse<Campaign>> {
    return this.client.request<PaginatedResponse<Campaign>>({
      method: "GET",
      path: "/v1/campaigns",
      query: params as Record<string, string | number | boolean | undefined>,
    });
  }

  async get(id: string): Promise<Campaign> {
    return this.client.request<Campaign>({
      method: "GET",
      path: `/v1/campaigns/${id}`,
    });
  }

  async sendTest(id: string, opts: { to: string }): Promise<void> {
    return this.client.request<void>({
      method: "POST",
      path: `/v1/campaigns/${id}/send-test`,
      body: { testEmail: opts.to },
    });
  }

  async send(id: string): Promise<void> {
    return this.client.request<void>({
      method: "POST",
      path: `/v1/campaigns/${id}/send`,
    });
  }
}
