# Contributing to friday-nestjs-starter

Use this guide to prepare changes to the Next Friday NestJS starter.

## Prerequisites

- Use the Node.js version declared by `.nvmrc` and `package.json#engines`.
- Use the pnpm version declared by `package.json#packageManager` through Corepack.
- Run PostgreSQL locally and export `DATABASE_URL`. E2E tests and `pnpm verify` need it.
- Install [`gitleaks`](https://github.com/gitleaks/gitleaks). The `pre-push` hook requires it.

From the repository root:

```sh
corepack enable
pnpm install
```

## Quality standards

- Fix lint, type, and test failures at their root cause.
- Edit source under `src/`, unit tests next to the source as `*.test.ts`, and e2e tests under `test/` as `*.e2e.test.ts`.
- Treat `dist/` as generated output.

## Verification

Run the narrowest check that covers the change. Run `pnpm verify` before submitting wide changes.

For focused checks, use the relevant script in [`package.json`](package.json). Do not report CI-owned checks as local successes.

## Pull requests

- Use `<type>(<scope>): <subject>` for commit messages and pull request titles.
- Keep each pull request focused on one cohesive change.
- Describe observable API effects.
- Report only checks that actually ran and include their results.
- Add or update tests only when they protect a distinct observable contract.
