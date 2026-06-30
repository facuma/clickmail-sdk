# Contributing to ClickMail SDK

Thank you for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/facuma/clickmail-sdk.git
cd clickmail-sdk
npm install
```

## Development Commands

```bash
npm run build       # Build ESM + CJS + types
npm run dev         # Build in watch mode
npm run test        # Run tests
npm run test:watch  # Run tests in watch mode
npm run typecheck   # TypeScript type checking
```

## Project Structure

```
src/
  client.ts         # Main ClickMail class and HTTP client
  errors.ts         # Typed error classes
  webhook.ts        # Webhook signature verification
  index.ts          # Public API exports
  resources/        # One file per API resource
types/              # TypeScript type definitions
tests/              # Vitest unit tests
examples/           # Usage examples
```

## Guidelines

- **No Axios**: Use native `fetch` only
- **TypeScript strict mode**: All code must pass `tsc --noEmit`
- **No API key logging**: Never expose the API key in error messages or logs
- **Tests required**: All new features must include vitest tests
- **Node 18+**: Target `ES2022`, no polyfills

## Submitting a Pull Request

1. Fork the repo
2. Create a branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Run typecheck: `npm run typecheck`
6. Commit: `git commit -m "feat: add my feature"`
7. Push and open a PR

## Reporting Issues

Open an issue at https://github.com/facuma/clickmail-sdk/issues
