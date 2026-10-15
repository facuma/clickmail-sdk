# ClickMail SDK

**TypeScript SDK for ClickMail — an email API for transactional and broadcast email.**

Send emails, manage domains, verify webhooks, and run campaigns — all from a type-safe TypeScript client.

---

## Installation

### From GitHub (available now)

```bash
npm install github:facuma/clickmail-sdk
```

### From a specific version/tag

```bash
npm install github:facuma/clickmail-sdk#v0.1.0
```

### Manual copy

Copy the `src/` folder into your project and install `typescript` and `tsup` as dev dependencies.

### From npm (coming soon)

```bash
npm install @clickmail/sdk
```

---

## Quickstart

```typescript
import { ClickMail } from "@clickmail/sdk";

const client = new ClickMail(process.env.CLICKMAIL_API_KEY!);

const email = await client.emails.send({
  from: "Agencia Norte <ventas@agencianorte.com>",
  to: ["cliente@gmail.com"],
  subject: "Bienvenido",
  html: "<h1>Hola!</h1><p>Gracias por registrarte.</p>",
});

console.log(email.id); // em_xxxxxxxxxxxxxxxx
```

---

## Configuration

```typescript
const client = new ClickMail({
  apiKey: process.env.CLICKMAIL_API_KEY,
  baseUrl: "https://resendapi.cubells.com.ar", // default
  timeoutMs: 10_000,
  retries: 2,
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | required | Your ClickMail API key (`ck_live_...` or `ck_test_...`) |
| `baseUrl` | `string` | `https://resendapi.cubells.com.ar` | API base URL |
| `timeoutMs` | `number` | `30000` | Request timeout in milliseconds |
| `retries` | `number` | `2` | Retries for 429/5xx responses (see [Retries and idempotency](#retries-and-idempotency)) |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch implementation |

---

## Sending Emails

### Basic email

```typescript
await client.emails.send({
  from: "sender@yourdomain.com",
  to: ["user@example.com"],
  cc: ["cc@example.com"],
  bcc: ["bcc@example.com"],
  replyTo: ["reply@example.com"],
  subject: "Hello from ClickMail",
  html: "<p>Hello world</p>",
  text: "Hello world",
});
```

### With a template

```typescript
await client.emails.send({
  from: "sender@yourdomain.com",
  to: ["user@example.com"],
  templateId: "tpl_welcome",
  variables: {
    name: "Juan Pérez",
    activationLink: "https://app.example.com/activate?token=abc",
  },
});
```

### With idempotency key (safe to retry)

`send()` always sends an `Idempotency-Key` — a random one unless you pass your own — so
the SDK's automatic retries can never send the same email twice. Pass a stable key when
*your* code may retry the call (e.g. a job that can run twice):

```typescript
await client.emails.send({
  from: "sender@yourdomain.com",
  to: ["user@example.com"],
  subject: "Invoice #1234",
  html: "<p>Your invoice is ready.</p>",
  idempotencyKey: "invoice-1234-send",
});
```

### With attachments

```typescript
import { readFile } from "node:fs/promises";

await client.emails.send({
  from: "Tesorería <tesoreria@yourdomain.com>",
  to: ["proveedor@example.com"],
  subject: "Comprobante de pago",
  html: '<p>Adjunto el comprobante.</p><img src="cid:logo">',
  attachments: [
    { filename: "comprobante.pdf", content: await readFile("./comprobante.pdf") },
    { filename: "logo.png", content: await readFile("./logo.png"), contentId: "logo" },
  ],
});
```

`content` takes a `Buffer`/`Uint8Array` or a base64 string. Up to 10 files and ~28 MB in
total; executable types SES refuses (`.exe`, `.bat`, `.js`…) are rejected with
`ATTACHMENT_TYPE_NOT_ALLOWED`.

### Threading (replying to an email you sent)

```typescript
const first = await client.emails.send({ /* … */ });

// Later, in the same thread:
await client.emails.send({
  from: "tesoreria@yourdomain.com",
  to: ["proveedor@example.com"],
  subject: "Re: Comprobante de pago",
  text: "Te reenvío la versión corregida.",
  inReplyToEmailId: first.id, // or inReplyTo: "<message-id@…>"
});

// The sent email's RFC Message-ID (available once sent):
const { messageIdHeader } = await client.emails.get(first.id);
```

Inbound emails that reply to one of your sends carry its id in `inReplyToEmailId`
(`in_reply_to_email_id` in the `email.received` webhook).

### Retrieve and list emails

```typescript
const email = await client.emails.get("em_abc123");

const { data, meta } = await client.emails.list({ status: "delivered", page: 1, limit: 20 });
```

---

## Domains

```typescript
// Register a domain
const domain = await client.domains.create({ domain: "yourdomain.com" });

// List and inspect
const domains = await client.domains.list();
const d = await client.domains.get("dom_abc");

// Trigger verification check
const checked = await client.domains.check("dom_abc");
console.log(checked.status); // "verified" | "pending" | "failed"
console.log(checked.dkimRecords); // DNS records to add
```

---

## Senders

```typescript
const sender = await client.senders.create({ email: "hello@yourdomain.com", name: "My App" });
const senders = await client.senders.list();

// Revoke: sends, replies and campaigns from it fail with SENDER_DISABLED
await client.senders.disable(sender.id);
await client.senders.enable(sender.id);
```

---

## Webhooks

### Create and manage webhooks

```typescript
const webhook = await client.webhooks.create({
  url: "https://yourapp.com/webhooks/clickmail",
  events: ["email.delivered", "email.bounced", "email.complained"],
});

await client.webhooks.update(webhook.id, { active: false });
await client.webhooks.delete(webhook.id);
```

### Verify webhook signatures

```typescript
import { constructWebhookEvent } from "@clickmail/sdk/webhook";

const event = constructWebhookEvent({
  payload: rawBody,           // string | Buffer | Uint8Array — the raw body
  headers: req.headers,       // reads X-Webhook-Signature (or pass `signature`)
  secret: process.env.CLICKMAIL_WEBHOOK_SECRET,
});

// Delivery is at-least-once: de-duplicate on event.id (stable across retries).
switch (event.type) {
  case "email.delivered":
    await markEmailDelivered(event.data.email_id);
    break;
  case "email.bounced":
    await handleBounce(event.data.recipients);
    break;
  case "email.received":
    await saveInboundEmail(event.data.id, event.data.from.email, event.data.subject);
    break;
}
```

`event` is a discriminated union: narrow it by `event.type` before reading `event.data`.
Pass `toleranceSeconds` to reject events with an old timestamp (retries keep the original
timestamp and span ~2 hours, so use a window that covers them).

### Delivery log

Failed deliveries are retried with exponential backoff for ~2 hours. Inspect and resend them:

```typescript
const { data } = await client.webhooks.deliveries.list({ status: "FAILED" });
const delivery = await client.webhooks.deliveries.get(data[0].id); // payload + last response
await client.webhooks.deliveries.redeliver(delivery.id);           // same event id
```

### Available webhook events

| Event | Description |
|---|---|
| `email.sent` | Email accepted for delivery |
| `email.delivered` | Email delivered to recipient |
| `email.bounced` | Delivery permanently failed |
| `email.complained` | Recipient marked as spam |
| `email.failed` | Sending failed |
| `email.opened` | Email opened (if tracking enabled) |
| `email.clicked` | Link clicked |
| `email.received` | Email received on an inbound address |
| `project.suspended` | Reserved — not emitted yet |
| `usage.quota_exceeded` | Reserved — not emitted yet |
| `abuse.signal_created` | Reserved — not emitted yet |

---

## Inbound (receiving email)

Requires an API key with `inbound:read`, plus `inbound:write` to reply.

```typescript
const { data } = await client.inbound.list({ status: "PROCESSED", limit: 20 });
const email = await client.inbound.get(data[0].id);

// Attachments and the raw MIME are served through short-lived presigned URLs
const { url } = await client.inbound.getAttachment(email.id, email.attachments[0].id);
const raw = await client.inbound.getRaw(email.id);

// Reply: goes to the original Reply-To/From and threads with it
await client.inbound.reply(email.id, {
  from: "Support <support@yourdomain.com>",
  text: "Thanks, we are on it.",
  replyAll: true,                 // also the original To/Cc (minus your own addresses)
  bcc: ["archive@yourdomain.com"],
  attachments: [{ filename: "receipt.pdf", content: pdfBuffer }],
});
```

### Receiving addresses

```typescript
// Once per domain (the response includes the MX record to publish)
await client.domains.enableInbound(domainId);

const address = await client.inbound.addresses.create({
  localPart: "mandato-42",
  host: "inbound.yourdomain.com",
  forwardWebhookUrl: "https://yourapp.com/webhooks/inbound", // optional
});

await client.inbound.addresses.list({ active: true });
await client.inbound.addresses.disable(address.id); // stop receiving, keep history
```

---

## Retries and idempotency

- `GET`, `PATCH` and `DELETE` are retried on 429/5xx and timeouts with exponential backoff.
- `POST` requests are retried on 5xx/timeouts only when they carry an `Idempotency-Key`
  (`emails.send` and `inbound.reply` always do). Other `POST`s retry only on 429, which is
  rejected before anything happens.

---

## Templates

```typescript
const template = await client.templates.create({
  name: "Welcome Email",
  slug: "welcome",
  subject: "Welcome, {{name}}!",
  html: "<h1>Hi {{name}}</h1><p>Welcome to {{company}}.</p>",
});

await client.templates.activate(template.id);

const rendered = await client.templates.render(template.id, {
  name: "Juan",
  company: "Acme Corp",
});

await client.templates.update(template.id, { subject: "New subject" });
await client.templates.archive(template.id);
```

---

## Campaigns

```typescript
const campaign = await client.campaigns.create({
  name: "January Newsletter",
  fromEmail: "newsletter@yourdomain.com",
  subject: "Our latest updates",
  html: "<h1>January 2024</h1><p>Here's what's new...</p>",
});

await client.campaigns.sendTest(campaign.id, { to: "you@example.com" });
await client.campaigns.send(campaign.id);
```

---

## Contacts

```typescript
await client.contacts.create({
  email: "user@example.com",
  name: "Juan Pérez",
  metadata: { plan: "pro", source: "signup" },
});

const { data } = await client.contacts.list({ status: "subscribed" });

await client.contacts.update("con_abc", { status: "unsubscribed" });
await client.contacts.delete("con_abc");
```

---

## Suppressions

```typescript
await client.suppressions.create({
  email: "user@example.com",
  reason: "manual",
});

const { data } = await client.suppressions.list();
await client.suppressions.delete("sup_abc");
```

---

## Error Handling

All errors extend `ClickMailError` and include `statusCode` (the HTTP status of the response), `code`, and `message`. The class is chosen from the API's error `code` when it is a known one, otherwise from the HTTP status; anything unrecognized is an `ApiError` with the code returned by the API (or `API_ERROR`).

```typescript
import {
  ClickMail,
  AuthenticationError,
  PermissionError,
  RateLimitError,
  ValidationError,
  QuotaExceededError,
  SandboxRecipientNotVerifiedError,
  DomainNotVerifiedError,
  SuppressedRecipientError,
  ClickMailError,
} from "@clickmail/sdk";

try {
  await client.emails.send({ ... });
} catch (err) {
  if (err instanceof AuthenticationError) {
    // 401 — invalid or revoked API key
  } else if (err instanceof PermissionError) {
    // 403 — project suspended or insufficient permissions
  } else if (err instanceof RateLimitError) {
    // 429 — slow down, retry after a moment
  } else if (err instanceof QuotaExceededError) {
    // Monthly/daily/hourly quota exceeded
  } else if (err instanceof SandboxRecipientNotVerifiedError) {
    // Project in sandbox mode — recipient must be verified first
  } else if (err instanceof DomainNotVerifiedError) {
    // Sender domain not yet verified
  } else if (err instanceof SuppressedRecipientError) {
    // Recipient is on the suppression list
  } else if (err instanceof ValidationError) {
    // 400/422 — invalid payload (details.messages lists each problem when available)
  } else if (err instanceof ClickMailError) {
    console.error(`[${err.code}] ${err.message}`);
  }
}
```

---

## Usage with Next.js

### App Router (Route Handler)

```typescript
// app/api/send/route.ts
import { ClickMail } from "@clickmail/sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const client = new ClickMail(process.env.CLICKMAIL_API_KEY!);
  const { to, name } = await request.json();

  const result = await client.emails.send({
    from: "noreply@yourdomain.com",
    to: [to],
    subject: `Welcome, ${name}!`,
    html: `<p>Hi <strong>${name}</strong>, thanks for signing up.</p>`,
  });

  return NextResponse.json(result);
}
```

### Server Action

```typescript
// app/actions/send-email.ts
"use server";
import { ClickMail } from "@clickmail/sdk";

const client = new ClickMail(process.env.CLICKMAIL_API_KEY!);

export async function sendWelcomeEmail(formData: FormData) {
  await client.emails.send({
    from: "noreply@yourdomain.com",
    to: [formData.get("email") as string],
    subject: "Welcome!",
    html: "<p>Thanks for signing up.</p>",
  });
}
```

---

## Usage with NestJS

```typescript
// mail.service.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClickMail } from "@clickmail/sdk";

@Injectable()
export class MailService {
  private readonly client: ClickMail;

  constructor(private config: ConfigService) {
    this.client = new ClickMail(this.config.getOrThrow("CLICKMAIL_API_KEY"));
  }

  async sendWelcome(to: string, name: string) {
    return this.client.emails.send({
      from: "noreply@yourdomain.com",
      to: [to],
      subject: `Welcome, ${name}!`,
      html: `<p>Hi ${name}, your account is ready.</p>`,
    });
  }
}
```

---

## Environment Variables

```env
CLICKMAIL_API_KEY=ck_live_xxx
CLICKMAIL_WEBHOOK_SECRET=whsec_xxx
```

Copy `.env.example` to `.env` and fill in your values.

---

## Commands

```bash
npm install            # Install dependencies
npm run build          # Build ESM + CJS + types to dist/
npm run dev            # Build in watch mode
npm run test           # Run tests
npm run test:watch     # Tests in watch mode
npm run typecheck      # TypeScript type checking
npm run prepack        # Run before npm pack (triggers build)
```

### Install from GitHub

```bash
npm install github:facuma/clickmail-sdk
```

### Install a specific tag

```bash
npm install github:facuma/clickmail-sdk#v0.1.0
```

### Test locally with npm pack

```bash
npm pack
npm install ./clickmail-sdk-0.1.0.tgz
```

---

## Publishing to npm (when ready)

```bash
npm login
npm publish --access public
```

> The package name is `@clickmail/sdk`. Make sure you own the `@clickmail` npm organization before publishing.

---

## Links

- Dashboard: Coming soon
- Documentation: Coming soon
- API Reference: Coming soon
- Issues: [github.com/facuma/clickmail-sdk/issues](https://github.com/facuma/clickmail-sdk/issues)

---

## License

MIT — see [LICENSE](LICENSE)
