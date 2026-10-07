# friday-nestjs-starter

NestJS starter for Next Friday projects. It uses the shared Next Friday ESLint, Prettier, and Commitlint configurations.

## Setup

```sh
corepack enable
pnpm install
```

The `pre-push` hook requires [`gitleaks`](https://github.com/gitleaks/gitleaks).

## Run

`PORT` and `DATABASE_URL` (PostgreSQL) are required. The server does not start without them. Set `CORS_ORIGINS` (comma-separated) to allow browser clients from other origins.

```sh
export DATABASE_URL=postgres://localhost:5432/friday_nestjs_starter
PORT=3000 pnpm start:dev # watch mode
pnpm build && PORT=3000 pnpm start:prod
```

The OpenAPI UI is at `http://localhost:3000/docs`.

## Database

[Drizzle ORM](https://orm.drizzle.team) on PostgreSQL. Define tables in `src/**/*.schema.ts`, then:

```sh
pnpm db:generate # write a SQL migration to drizzle/
pnpm db:migrate  # apply migrations
pnpm db:studio   # browse data
```

`GET /health` checks the database connection and returns 503 when it is down.

## Verify

```sh
pnpm lint:check
pnpm format:check
pnpm typecheck
pnpm test     # unit tests: src/**/*.test.ts
pnpm test:e2e # e2e tests: test/**/*.e2e.test.ts (needs DATABASE_URL)
pnpm verify   # every check that CI runs
```

## Observability

The app is instrumented with [NestJS Observe](https://observe.nestjs.com). To send telemetry, put your app key and secret into the `ObserveModule.forRoot()` call in `src/app.module.ts`.

## Compliance

ISO/IEC 27001:2022 and PCI DSS v4.0 controls are mapped to repository evidence in [docs/compliance.md](docs/compliance.md). Vulnerability remediation targets are in [SECURITY.md](SECURITY.md).
