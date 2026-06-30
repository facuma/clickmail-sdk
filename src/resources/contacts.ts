import type { ClickMail } from "../client.js";
import type {
  Contact,
  CreateContactPayload,
  UpdateContactPayload,
  ListContactsParams,
} from "../../types/contacts.js";
import type { PaginatedResponse } from "../../types/common.js";

export class ContactsResource {
  constructor(private readonly client: ClickMail) {}

  async create(payload: CreateContactPayload): Promise<Contact> {
    return this.client.request<Contact>({
      method: "POST",
      path: "/v1/contacts",
      body: payload,
    });
  }

  async list(
    params?: ListContactsParams
  ): Promise<PaginatedResponse<Contact>> {
    return this.client.request<PaginatedResponse<Contact>>({
      method: "GET",
      path: "/v1/contacts",
      query: params as Record<string, string | number | boolean | undefined>,
    });
  }

  async update(id: string, payload: UpdateContactPayload): Promise<Contact> {
    return this.client.request<Contact>({
      method: "PATCH",
      path: `/v1/contacts/${id}`,
      body: payload,
    });
  }

  async delete(id: string): Promise<void> {
    return this.client.request<void>({
      method: "DELETE",
      path: `/v1/contacts/${id}`,
    });
  }
}
