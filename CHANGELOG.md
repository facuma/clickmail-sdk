# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
