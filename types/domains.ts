export interface DnsRecord {
  type: "CNAME" | "TXT" | "MX";
  name: string;
  value: string;
  priority?: number;
}

export type DomainStatus = "pending" | "verified" | "failed";

export interface Domain {
  id: string;
  projectId: string;
  domain: string;
  status: DomainStatus;
  verificationStatus: string;
  dkimStatus: string;
  dkimRecords: DnsRecord[];
  mailFromDomain: string;
  mailFromRecords: DnsRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDomainPayload {
  domain: string;
}
