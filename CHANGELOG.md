# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-10-15

### Fixed

- Typed errors are now thrown against the live API. The SDK only recognized
  `{ error: { code, message } }` bodies, but the API answers with a top-level
  `{ code, message }` (business errors) or NestJS's default
  `{ statusCode, message, error }`, so every failure surfaced as a generic
  `ClickMailError` with code `API_ERROR` (e.g. a bad API key was not an
  `AuthenticationError`). All three shapes are now mapped.
- Without a recognized `code`, the error class comes from the HTTP status:
  401 → `AuthenticationError`, 403 → `PermissionError`, 429 → `RateLimitError`,
  400/422 → `ValidationError`; anything else is an `ApiError`.
- Typed errors keep the real HTTP `statusCode` instead of a fixed one (e.g.
  `QuotaExceededError` from a 400 now reports 400 and is no longer retried as
  if it were a 429).
- Validation errors with a list of messages are joined into `message` and the
  list is available in `details.messages`.

## [0.3.0] - 2026-10-15

Version aligned with the ClickMail monorepo SDK (there is no 0.2.0 release here).

### Added

- `client.inbound`: `list`, `get`, `getRaw`, `getAttachment` and `reply` for received
  emails (API key scopes `inbound:read` / `inbound:write`). Replies thread with the
  original message (In-Reply-To / References).
- `client.webhooks.deliveries`: `list`, `get` and `redeliver` for the webhook delivery log.
- `email.received` webhook event, with typed `EmailReceivedData` (attachments with
  `stored` / `download_url`, `in_reply_to`, `references`, SPF/DKIM/DMARC verdicts).
- Webhook envelopes expose the event `id` (stable across retries — de-duplicate on it).
- `constructWebhookEvent` / `verifyWebhookSignature` accept `headers` (Node or fetch
  `Headers`) to read `X-Webhook-Signature`, and an optional `toleranceSeconds` check
  on the event timestamp. `signature` is now optional when `headers` is given.
- `ClickMailError` is re-exported from `@clickmail/sdk/webhook`.
- Example `examples/node/inbound.ts`.

### Changed

- `emails.send` and `inbound.reply` always send an `Idempotency-Key` (random unless
  you pass one), so automatic retries can never send twice.
- Other `POST` requests are no longer retried on 5xx or timeouts (only on 429), since
  repeating them could duplicate the action. `GET`/`PATCH`/`DELETE` retry as before.
- **Types:** `WebhookEventPayload` is now a discriminated union. Code that reads
  `event.data.email_id` must first narrow with `event.type` (e.g. in a `switch`).

### Fixed

- `examples/node/verify-webhook.ts` imported `ClickMailError` from the webhook subpath,
  which did not export it.

## [0.1.0] - 2024-01-01

### Added

- Initial public release of the ClickMail TypeScript SDK
- `ClickMail` client with dual constructor (string or config object)
- Resources: `emails`, `domains`, `senders`, `webhooks`, `templates`, `campaigns`, `contacts`, `suppressions`
- Typed error hierarchy: `AuthenticationError`, `PermissionError`, `RateLimitError`, `ValidationError`, `QuotaExceededError`, `SandboxRecipientNotVerifiedError`, `DomainNotVerifiedError`, `SuppressedRecipientError`
- Automatic retry with exponential backoff for 429/5xx responses
- `Idempotency-Key` header support for email sends
- Webhook signature verification via HMAC SHA256
- `constructWebhookEvent()` helper for safe event parsing
- ESM and CommonJS builds via tsup
- Full TypeScript type definitions
- Examples for Node.js, Next.js App Router, Next.js Server Actions, NestJS
