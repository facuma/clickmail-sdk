import type { ClickMail } from "../client.js";
import type {
  Template,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  RenderTemplateResponse,
} from "../../types/templates.js";

export class TemplatesResource {
  constructor(private readonly client: ClickMail) {}

  async create(payload: CreateTemplatePayload): Promise<Template> {
    return this.client.request<Template>({
      method: "POST",
      path: "/v1/templates",
      body: payload,
    });
  }

  async list(): Promise<Template[]> {
    return this.client.request<Template[]>({
      method: "GET",
      path: "/v1/templates",
    });
  }

  async get(id: string): Promise<Template> {
    return this.client.request<Template>({
      method: "GET",
      path: `/v1/templates/${id}`,
    });
  }

  async update(id: string, payload: UpdateTemplatePayload): Promise<Template> {
    return this.client.request<Template>({
      method: "PATCH",
      path: `/v1/templates/${id}`,
      body: payload,
    });
  }

  async render(
    id: string,
    variables: Record<string, unknown>
  ): Promise<RenderTemplateResponse> {
    return this.client.request<RenderTemplateResponse>({
      method: "POST",
      path: `/v1/templates/${id}/render`,
      body: { variables },
    });
  }

  async activate(id: string): Promise<Template> {
    return this.client.request<Template>({
      method: "POST",
      path: `/v1/templates/${id}/activate`,
    });
  }

  async archive(id: string): Promise<Template> {
    return this.client.request<Template>({
      method: "POST",
      path: `/v1/templates/${id}/archive`,
    });
  }
}
