# Next Friday NestJS Starter: Overview

## What This Repository Is

`friday-nestjs-starter` is the starting point for Next Friday HTTP services. It is a NestJS 12 application on the Express platform, written in ESM TypeScript. It ships the shared Next Friday tooling, hooks, and CI ready to use.

| Surface                                     | Owner                                                |
| :------------------------------------------ | :--------------------------------------------------- |
| Application modules, controllers, providers | This repository                                      |
| HTTP contract (OpenAPI via Swagger)         | This repository                                      |
| Observability wiring (`@nestjs/observe`)    | This repository                                      |
| ESLint, Prettier, Commitlint policy         | `friday-code-standards` (published packages)         |
| Custom `friday/*` lint rules                | `eslint-plugin-friday`, bundled by the ESLint config |

## Design Stance

- Keep the starter small. Each feature it ships is one a new service needs on day one.
- Prefer Nest built-ins and the existing dependencies over new packages.
- Treat the app as server-only and its configuration as explicit. The rationale is in [ADR 0001](../adr/0001-server-only-nestjs-application.md).

## Verification

`pnpm verify` runs these checks in order:

- lint
- formatting and `.editorconfig` (editorconfig-checker)
- `package.json` ordering
- peer dependency contracts
- types
- unit tests with coverage
- e2e tests
- Knip
- dependency-cruiser (no cycles, no orphans)
- `nest build`

For material pushes, the pre-push hook scans outgoing commits with Gitleaks and then runs `pnpm verify`, `pnpm audit`, and a 95% patch-coverage check.

CI runs the same checks as separate jobs and enforces 95% patch coverage on pull requests. It also validates PR titles, runs Zizmor on workflow changes, and labels PRs.
