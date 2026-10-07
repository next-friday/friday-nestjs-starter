# Build a server-only NestJS application on shared Friday standards

## Context

This repository starts Next Friday HTTP services. It began as the stock NestJS template, which used oxlint and its own Prettier settings, and its tsconfig included browser types. The other Next Friday repositories already share ESLint, Prettier, and Commitlint policy through published `@next-friday/*-config-friday` packages.

## Decision

- Compose the published `@next-friday/eslint-config-friday`, `prettier-config-friday`, and `commitlint-config-friday` packages at the root. Keep no local policy copies.
- Treat the application as Node-only. ESLint runs `friday({browser: false, nestjs: true})`, and `tsconfig.json` limits `lib` to `ES2023`.
- Document the HTTP contract with `@nestjs/swagger` decorators and serve the OpenAPI UI at `/docs`. This is the contract the NestJS typed policy requires.
- Require runtime configuration such as `PORT` and `DATABASE_URL` explicitly, and fail at startup when it is missing.

## Consequences

- A lint or format policy change happens in `friday-code-standards` and arrives here as a dependency update.
- Browser globals fail typecheck, so server code cannot depend on them by accident.
- Each controller and route needs Swagger decorators before lint passes.
- Local runs must set `PORT` and `DATABASE_URL`. There are no defaults.
