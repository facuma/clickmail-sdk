export type WebhookEventType =
  | "email.sent"
  | "email.delivered"
  | "email.bounced"
  | "email.complained"
  | "email.failed"
  | "email.opened"
  | "email.clicked"
  | "project.suspended"
  | "usage.quota_exceeded"
  | "abuse.signal_created"
  | "*";

export interface Webhook {
  id: string;
  projectId: string;
  url: string;
  events: WebhookEventType[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookPayload {
  url: string;
  events: WebhookEventType[];
  active?: boolean;
}

export interface UpdateWebhookPayload {
  url?: string;
  events?: WebhookEventType[];
  active?: boolean;
}

export interface WebhookEventPayload {
  type: WebhookEventType;
  project_id: string;
  timestamp: string;
  data: {
    email_id: string;
    ses_message_id: string;
    status: string;
    recipients: string[];
    error?: string;
  };
}
