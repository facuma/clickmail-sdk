import type { PaginationParams } from "./common.js";

export type CampaignStatus = "draft" | "sending" | "sent" | "paused" | "failed";

export interface Campaign {
  id: string;
  projectId: string;
  name: string;
  subject: string;
  html: string;
  text: string;
  fromEmail: string;
  status: CampaignStatus;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignPayload {
  name: string;
  fromEmail: string;
  subject: string;
  html: string;
  text?: string;
}

export interface ListCampaignsParams extends PaginationParams {
  status?: CampaignStatus;
}
