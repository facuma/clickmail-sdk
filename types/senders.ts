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

export interface UpdateSenderPayload {
  name?: string;
  /**
   * `false` disables the sender: emails, replies and campaigns from it are
   * rejected with `SENDER_DISABLED`. There is no delete on purpose — an
   * unregistered address on a verified domain can send.
   */
  active?: boolean;
}
