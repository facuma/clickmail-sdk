import type { PaginationParams } from "./common.js";

export type ContactStatus = "subscribed" | "unsubscribed" | "bounced" | "complained";

export interface Contact {
  id: string;
  projectId: string;
  email: string;
  name: string;
  status: ContactStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactPayload {
  email: string;
  name?: string;
  status?: ContactStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateContactPayload {
  name?: string;
  status?: ContactStatus;
  metadata?: Record<string, unknown>;
}

export interface ListContactsParams extends PaginationParams {
  status?: ContactStatus;
}
