export type SenderStatus = "active" | "disabled";

export interface Sender {
  id: string;
  projectId: string;
  domainId: string;
  email: string;
  name: string;
  status: SenderStatus;
  createdAt: string;
}

export interface CreateSenderPayload {
  email: string;
  name?: string;
}
