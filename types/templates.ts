export type TemplateStatus = "draft" | "active" | "archived";

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  subject: string;
  html: string;
  text?: string;
  createdAt: string;
}

export interface Template {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  subject: string;
  html: string;
  text?: string;
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
  versions?: TemplateVersion[];
}

export interface CreateTemplatePayload {
  name: string;
  slug: string;
  subject: string;
  html: string;
  text?: string;
}

export interface UpdateTemplatePayload {
  name?: string;
  subject?: string;
  html?: string;
  text?: string;
}

export interface RenderTemplateResponse {
  subject: string;
  html: string;
  text?: string;
}
