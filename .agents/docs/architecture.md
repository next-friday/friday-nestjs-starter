# Next Friday NestJS Starter: Architecture

## Repository Topology

```text
.
├── .agents/
│   ├── adr/                    # Architecture decisions
│   ├── docs/                   # Agent documentation
│   ├── rules/                  # Repository invariants (.claude/rules symlink)
│   └── skills/                 # Repository skills (.claude/skills symlink)
├── .github/                    # CI, PR governance, security scans, Zizmor
├── .husky/                     # commit-msg, pre-commit, pre-push
├── scripts/
│   └── check-patch-coverage.ts   # Pre-push patch-coverage gate
├── src/
│   ├── main.ts                 # Bootstrap: env, Observe instrument, Swagger, listen
│   ├── app.module.ts           # Root module; creates the Observe module
│   ├── database/               # Global Drizzle module (DATABASE token, pg Pool)
│   ├── health/                 # GET /health readiness check
│   └── *.test.ts               # Unit tests beside their source
├── test/
│   └── *.e2e.test.ts           # HTTP tests against the full AppModule
├── drizzle.config.ts           # drizzle-kit: src/**/*.schema.ts -> drizzle/
├── .dependency-cruiser.ts      # Import-graph rules: no cycles, no orphans
├── eslint.config.ts
├── vitest.config.ts            # Unit tests, coverage
└── vitest.config.e2e.ts        # E2E tests
```

## Runtime Flow

1. `src/main.ts` reads `PORT` and throws when it is missing.
2. `DatabaseModule` reads `DATABASE_URL`, throws when it is missing, and creates a lazy `pg` Pool. The pool connects on first query and closes on application shutdown.
3. `NestFactory.create(AppModule, {instrument: ObserveInstrument})` builds the app with Observe instrumentation.
4. `configureApp` (`src/app.setup.ts`) applies the security baseline that e2e also uses:
   - the `nestjs-pino` logger: JSON lines with an `x-request-id`, and credentials and PAN redacted per `LOG_REDACT_PATHS`;
   - `helmet()` OWASP headers (Swagger UI still works under its CSP because its scripts load from the same origin);
   - a global `ValidationPipe` with whitelist and forbid-unknown;
   - a CORS allow-list from `CORS_ORIGINS` (cross-origin requests are refused when it is unset);
   - shutdown hooks.

   `AppModule` registers a global `ThrottlerGuard` (100 requests per minute per client).

5. `SwaggerModule` builds the OpenAPI document from controller decorators and serves it at `/docs`.
6. The app listens on `PORT`.

`src/app.module.ts` calls `createObserveModule()` once. It imports `ObserveModule.forRoot()` and exports only `ObserveInstrument` for `main.ts`. The `appKey` and `appSecret` values are placeholders. Real values come from observe.nestjs.com.

## Database

`DatabaseModule` is global and exports the `DATABASE` token, a Drizzle `NodePgDatabase`. Inject it with `@Inject(DATABASE)`. `GET /health` runs `select 1` through it and returns 503 when Postgres is unreachable, which makes it usable as a readiness probe.

Tables live in `*.schema.ts` files under `src/`. `pnpm db:generate` writes SQL migrations to `drizzle/`, and `pnpm db:migrate` applies them. Until the first schema file exists, `db:generate` reports that it found no schema files.

## Module Structure

`AppModule` is the root module. A feature adds a controller and a provider, registers them in a module, and imports that module into `AppModule`. Controllers stay thin and delegate to injectable providers.

## Testing

- Unit tests (`src/**/*.test.ts`) build a `TestingModule` with only the controller and providers under test.
- E2E tests (`test/**/*.e2e.test.ts`) import the full `AppModule`, so Observe and the database load in them too. They need `DATABASE_URL`; CI provides a Postgres service container. They drive HTTP through `supertest` against `app.getHttpServer()`.
- Coverage collects from `src/**/*.ts`, excluding the composition roots `src/main.ts` and `src/app.module.ts`. Thresholds: 95% lines, functions, and statements, and 90% branches. CI and pre-push both enforce 95% patch coverage with `scripts/check-patch-coverage.ts`.

## Build and Deployment

`nest build` compiles with `tsconfig.build.json` into `dist/`. That config excludes `test/` and `*.test.ts`. `pnpm start:prod` runs `node dist/main`. `pnpm deploy` runs `nest deploy` through `@nestjs/mau`, which is why Knip ignores that dependency.

## Repository Verification

Local hooks mirror repository policy:

- `commit-msg` → Commitlint (`type(scope): subject`, lowercase scope, no body or footer)
- `pre-commit` → lint-staged: ESLint and Prettier, plus `sort-package-json` for `package.json`
- `pre-push` is built for edit-push loops:
  - It requires every pushed ref to match the checked-out commit, then scans outgoing commits with Gitleaks and TruffleHog.
  - When non-doc files changed, it requires a clean tree and a reachable `DATABASE_URL`. It then runs zizmor, OSV-Scanner, and Semgrep with the versions and arguments of their workflows, and each `pnpm <script>` from the `verify` script as its own gate, with `DATABASE_URL` unset for every gate except `test:e2e` to match CI, followed by patch coverage (against `<remote>/main`, falling back to `origin/main` or `main`) and `pnpm audit`.
  - It stops at the first failing gate and prints only that gate's last 40 lines. The full log is in `.git/pre-push/<gate>.log`.
  - The last line is the verdict: `pre-push: PASS tree=<sha>` or `pre-push: FAIL gate=<name> rerun="<command>" log=<path>`. Run the `rerun` command to reproduce the failure without pushing.
  - Trees that passed are recorded in `.git/pre-push/passed-trees`. Pushing the same tree again, as with an amended message or a retried push, skips the gates.
  - The order of the `verify` script is the gate order, so keep cheap gates first.

Compliance evidence for ISO/IEC 27001 and PCI DSS is mapped in [`docs/compliance.md`](../../docs/compliance.md).

CI (`.github/workflows/ci.yml`) is change-aware. `.github/file-filters.yml` marks "heavy" changes, and only those run the full job set. `All Checks` aggregates the jobs into a single required status. Every job sets up pnpm through `.github/actions/setup-pnpm`, and third-party actions are pinned by SHA.

Security workflows, mapped to OWASP practice:

- `sast.yml`: Semgrep OWASP Top 10, TypeScript, Node.js, and secrets rules. Findings fail the job.
- `secret-scan.yml`: TruffleHog, plus gitleaks with `.gitleaks.toml` (default rules and a PAN detector), over commit history.
- `osv-scanner.yml`: SCA against `pnpm-lock.yaml`. Findings fail the job.
- `dast.yml`: OWASP ZAP API scan against `/docs-json`. It is report-only until `.zap/rules.tsv` holds a triaged baseline.
- `sbom.yml`: CycloneDX SBOM artifact.

The repository is private on GitHub Free, so it has no code scanning, Dependency Review, code owners, or branch protection. Security jobs fail on findings instead of uploading SARIF, and their results live in the job log.
