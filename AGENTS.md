# Repository Guidelines

## Agent Guidelines

- **Command Authority**: Read-only inspection and non-mutating verification commands needed to complete a requested task are permitted. Dependency installation, network-dependent commands, destructive commands, Git writes, deployment, and external mutations require explicit authorization.
- **Diagnostics & Reporting**: Report the exact scope and checks that actually ran. Distinguish verified results from assumptions. Report Git hooks and CI as pending until they actually run.
- **Working-Tree Authority**: Explicit current user requirements come first. Otherwise inspect the current working tree immediately before editing; current files, not memory or Git history, define current behavior.
- **History Boundary**: Inspect Git history only when the user asks for historical investigation.
- **Rule Preflight**: Before editing, identify affected paths and read the applicable repository rules below.
- **Workflow Pointers**: PRs → [CONTRIBUTING.md](CONTRIBUTING.md), architecture and runtime flow → [`.agents/docs/architecture.md`](.agents/docs/architecture.md), agent docs → [`.agents/docs/index.md`](.agents/docs/index.md), ISO/IEC 27001 and PCI DSS evidence → [`docs/compliance.md`](docs/compliance.md). Review [`.agents/adr/`](.agents/adr/) before recording a durable architecture decision.

## Always-On Invariants

- **Direct & Minimal**: YAGNI and SSOT first. Prefer one concrete implementation over speculative wrappers, registries, or fallback branches. Fix root causes.
- **Platform First**: Nest and Node built-ins before new dependencies. Reuse lockfile dependencies.
- **Server Only**: This is a Node.js HTTP application. ESLint runs with `browser: false` and `tsconfig.json` sets `lib: ["ES2023"]`, so DOM globals fail typecheck. Write server code against Node and Nest APIs.
- **Explicit Environment**: Read required environment variables and throw when they are missing, as `src/main.ts` does for `PORT` and `DatabaseModule` does for `DATABASE_URL`. The Friday ESLint policy rejects `process.env.X ?? fallback`.
- **Documented HTTP Contract**: Every controller carries `@ApiTags`, and every route carries an `@Api*Response` from `@nestjs/swagger`. ESLint enforces this, and the OpenAPI UI is served at `/docs`.
- **Shared Standards**: ESLint, Prettier, and Commitlint policy comes from the published `@next-friday/*-config-friday` packages. Root config files only compose them, and `.claude/settings.json` blocks agent edits to them. Policy changes belong in `friday-code-standards`.
- **Cardholder Data**: Keep PAN, CVV, and credentials out of logs, fixtures, and code. Add every new sensitive field name to `LOG_REDACT_PATHS` in `src/logging.ts`. Tests use only published processor test PANs; the gitleaks `primary-account-number` rule rejects any other PAN.
- **Security Baseline**: `configureApp` in `src/app.setup.ts` applies logging, headers, validation, CORS, and Swagger for both `main.ts` and e2e. Change the baseline there, never in one entrypoint alone. Accept request bodies only through `class-validator` DTOs, which the global `ValidationPipe` whitelists.
- **Compliance Evidence**: A change to a control listed in [`docs/compliance.md`](docs/compliance.md) updates its row in the same change.
- **Sibling Symmetry**: Nest modules use consistent naming, file layout, and test placement unless a verified technical requirement requires a difference.

## Conventions That Bite

- Relative imports carry the `.js` extension (ESM, `nodenext`).
- Data access goes through Drizzle: inject the `DATABASE` token from `src/database/database.module.ts`. Tables live in `src/**/*.schema.ts`, which `drizzle.config.ts` collects; run `pnpm db:generate` after a schema change and commit the `drizzle/` migration.
- Test files end in `.test.ts`. Unit tests sit beside their source in `src/`. E2E tests live in `test/` as `*.e2e.test.ts` and run through `vitest.config.e2e.ts`. They boot the full app, so they need `DATABASE_URL` pointing at a reachable Postgres; unit tests replace `DATABASE` with a stub.
- `pnpm lint` and `pnpm format` rewrite files, including import and object-key order. Use `pnpm lint:check` and `pnpm format:check` to check without rewriting.
- A new dependency with an install script fails `pnpm install` until it is listed under `allowBuilds` in `pnpm-workspace.yaml`. Grant `true` only to scripts the package needs to work.
- A failed `git push` ends with `pre-push: FAIL gate=<name> rerun="<command>" log=<path>`. Run the `rerun` command, fix the cause, commit, and push again; `--no-verify` is not a fix.
- Run one test with `pnpm vitest run <file>` or `pnpm vitest run -t "<name>"`, and add `--config ./vitest.config.e2e.ts` for e2e.

## Rule Files & Skills

Repository invariants live in [`.agents/rules/`](.agents/rules/) (`.claude/rules/` is a symlink). Select rules per change:

| Trigger                       | Rule files                                                              |
| :---------------------------- | :---------------------------------------------------------------------- |
| New module, provider, or app  | `new-component.md`, `single-author-style.md`                            |
| Source files or exports       | `export-boundaries.md`, `typescript-first.md`, `single-author-style.md` |
| Diagnostics or error handling | `diagnostics-and-error-handling.md`                                     |
| Tests                         | `deterministic-testing.md`                                              |
| Manifests or dependencies     | `dependency-security.md`, `demand-driven-configuration.md`              |
| Configuration files           | `demand-driven-configuration.md`                                        |
| Hooks, workflows, toolchain   | `toolchain-and-runtime.md`                                              |
| Implementation choices        | `current-state-authority.md`                                            |

Repository skills → [`.agents/skills/`](.agents/skills/) when a skill description matches the task (`.claude/skills/` is a symlink).

## Verification

Use the narrowest relevant check during iteration. Run `pnpm verify` before concluding changes that span the application; it enforces coverage thresholds (95% lines, functions, and statements; 90% branches), with the composition roots `src/main.ts`, `src/app.module.ts`, and `src/app.setup.ts` excluded because e2e covers them. For dependency changes, also run `pnpm audit`.
