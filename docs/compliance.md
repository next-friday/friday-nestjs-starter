# Compliance Control Matrix

This matrix maps ISO/IEC 27001:2022 Annex A and PCI DSS v4.0 requirements (numbering unchanged in v4.0.1) to evidence in this repository. A repository cannot be certified on its own. ISO/IEC 27001 certifies an organization's ISMS, and PCI DSS assesses the cardholder data environment. Use this matrix as the software-development evidence for those assessments.

Status values:

- **Implemented**: this repository enforces the control, and the evidence column names the file or check.
- **Partial**: the repository provides the foundation; the service or organization must complete it.
- **Outside repo**: an organization, infrastructure, or GitHub-settings control. The repository cannot enforce it.

On GitHub Free, a private repository has no branch protection. CI results do not block merges, and `git push --no-verify` skips the hooks. "Implemented" therefore means the check exists and runs; an assessor will also ask for proof that it gates changes (action 2 below).

## ISO/IEC 27001:2022 Annex A

| Control                                | Evidence in repository                                                                                                                           | Status       |
| :------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| 5.21 ICT supply chain security         | SHA-pinned actions and container images, `pnpm-lock.yaml`, `allowBuilds` allowlist, SBOM (`sbom.yml`)                                            | Implemented  |
| 8.4 Access to source code              | Private repository with org membership and MFA. Code owners and branch protection need GitHub Team or Enterprise on private repositories         | Outside repo |
| 8.8 Technical vulnerability management | Semgrep, OSV-Scanner, `pnpm audit`, Dependabot, remediation targets in `SECURITY.md`                                                             | Implemented  |
| 8.9 Configuration management           | Config as code: `tsconfig.json`, `eslint.config.ts`, `pnpm-workspace.yaml` (`engineStrict`), `.nvmrc`, workflows                                 | Implemented  |
| 8.12 Data leakage prevention           | Log redaction (`src/logging.ts`), gitleaks PAN and secret rules (`.gitleaks.toml`), TruffleHog, `.env*` ignored (`.gitignore`)                   | Implemented  |
| 8.15 Logging                           | Structured JSON logs with request IDs (`nestjs-pino`); retention and protection depend on the log platform                                       | Partial      |
| 8.16 Monitoring activities             | `@nestjs/observe` instrumentation, `GET /health`; alerting is configured in the observability platform                                           | Partial      |
| 8.24 Use of cryptography               | HSTS via `helmet`; TLS termination and key management are infrastructure controls                                                                | Partial      |
| 8.25 Secure development life cycle     | `CONTRIBUTING.md`, Git hooks, CI (`ci.yml`), ADRs in `.agents/adr/`                                                                              | Implemented  |
| 8.26 Application security requirements | Global `ValidationPipe` (whitelist, forbid unknown), rate limiting (`ThrottlerGuard`), CORS allow-list, security headers                         | Implemented  |
| 8.27 Secure system architecture        | ADR 0001, `.dependency-cruiser.ts` (no cycles, no orphans), server-only `lib`                                                                    | Implemented  |
| 8.28 Secure coding                     | Strict type-aware ESLint (`@next-friday/eslint-config-friday`), Semgrep OWASP Top 10 rules (`sast.yml`)                                          | Implemented  |
| 8.29 Security testing                  | Unit and e2e tests with coverage thresholds, e2e header, CORS, and rate-limit assertions; ZAP API scan (`dast.yml`) is report-only until triaged | Implemented  |
| 8.31 Separation of environments        | Required explicit environment variables (`PORT`, `DATABASE_URL`); environment separation itself is infrastructure                                | Partial      |
| 8.32 Change management                 | Pull requests, Conventional Commits, PR title validation. Enforced required checks need GitHub Team or Enterprise on private repositories        | Partial      |
| 8.33 Test information                  | gitleaks `primary-account-number` rule blocks live-format PANs; only published test PANs are allowed                                             | Implemented  |
| 5.x, 6.x, 7.x organizational controls  | Policies, risk assessment, HR security, physical security                                                                                        | Outside repo |

## PCI DSS v4.0

| Requirement                                                      | Evidence in repository                                                                                       | Status       |
| :--------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :----------- |
| 2.2 Secure configuration                                         | `helmet` headers, `x-powered-by` removed, no default credentials, required env vars                          | Partial      |
| 3.3.1, 3.4.1 Sensitive authentication data and PAN masking       | `LOG_REDACT_PATHS` masks `pan`, `cardNumber`, `cvv`, `cvc`, `expiry` in logs                                 | Partial      |
| 3.5.1 PAN unreadable where stored                                | The starter stores no PAN. A service that stores PAN must add encryption or tokenization                     | Outside repo |
| 4.2.1 Strong cryptography in transit                             | HSTS header; TLS is terminated by the load balancer or ingress                                               | Partial      |
| 6.2.1 Bespoke software developed securely                        | Secure SDLC: hooks, CI, Semgrep, ADRs; review enforcement needs branch protection                            | Partial      |
| 6.2.2 Developer secure-coding training                           | Annual training records                                                                                      | Outside repo |
| 6.2.3, 6.2.3.1 Code review before release by a non-author        | Pull request review by team process. Enforced reviews need GitHub Team or Enterprise on private repositories | Outside repo |
| 6.2.4 Prevention of common software attacks                      | Input validation, rate limiting, security headers, Semgrep OWASP Top 10 rules, ZAP                           | Implemented  |
| 6.3.1 Identify security vulnerabilities                          | Semgrep, OSV-Scanner, `pnpm audit`, ZAP                                                                      | Implemented  |
| 6.3.2 Inventory of bespoke and third-party components            | CycloneDX SBOM (`sbom.yml`)                                                                                  | Implemented  |
| 6.3.3 Critical patches within one month                          | Remediation targets in `SECURITY.md`, Dependabot                                                             | Implemented  |
| 6.4.3 Payment page script authorization and integrity            | The API serves no payment pages. The front end that renders payment pages owns this control                  | Outside repo |
| 6.4.1, 6.4.2 Public-facing web application protection            | WAF in front of the service                                                                                  | Outside repo |
| 6.5.1 Change control procedures                                  | Pull requests and CI checks. Enforced required checks need GitHub Team or Enterprise on private repositories | Partial      |
| 6.5.3 Pre-production separated from production                   | GitHub Environments and separate infrastructure                                                              | Outside repo |
| 6.5.5 No live PANs in pre-production                             | gitleaks `primary-account-number` rule in pre-push and CI                                                    | Implemented  |
| 8.2, 8.3, 8.4 Identification, authentication, MFA                | GitHub org SSO and MFA; the starter ships no end-user authentication                                         | Outside repo |
| 8.6.2 No hard-coded credentials                                  | gitleaks and TruffleHog in pre-push and CI                                                                   | Implemented  |
| 10.2.1, 10.2.2 Audit log content                                 | Request logs with ID, method, URL, status, and timing. Add user identity once auth exists                    | Partial      |
| 10.3, 10.5.1, 10.6 Log protection, 12-month retention, time sync | Log platform and infrastructure                                                                              | Outside repo |
| 11.3 Internal and external vulnerability scans                   | Quarterly ASV scans of the deployed environment                                                              | Outside repo |
| 11.6.1 Payment page change and tamper detection                  | The API serves no payment pages. The front end that renders payment pages owns this control                  | Outside repo |
| 11.4 Penetration testing                                         | Annual and post-change penetration tests                                                                     | Outside repo |
| 12.x Information security policy                                 | Organization policy program                                                                                  | Outside repo |

## Actions to complete repository-owned controls

1. Enable Dependabot alerts and Dependabot security updates in the repository settings. GitHub Free includes both for private repositories.
2. Branch protection, code owners, code scanning, and secret scanning push protection need GitHub Team or Enterprise on private repositories, plus GitHub Advanced Security for code scanning and push protection. Until then, enforce non-author review and passing CI by team process, and record approvals on each pull request.
3. After the first ZAP run, triage its findings into `.zap/rules.tsv` and set `fail_action: true` in `dast.yml`.
