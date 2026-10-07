# Security policy

This is a private Next Friday repository. This policy covers its source code, its dependencies, and the services built from it.

## Supported versions

Security fixes apply to the default branch and to every deployed environment built from it.

## Report a vulnerability

Report vulnerabilities to `security@next-friday.com`. Keep vulnerability details out of GitHub issues, pull request descriptions, commit messages, and shared chat channels. Organization members can read those places, and they persist.

Include:

- reproduction steps;
- the affected commit or deployed environment;
- relevant configuration and environment details.

Remove secrets, cardholder data, and personal data from the report.

### Leaked secrets or cardholder data

Treat a leaked credential, key, or PAN as a security incident:

1. Rotate or revoke the credential immediately. Removing it from Git history does not make it safe again.
2. Report the leak to `security@next-friday.com` with the commit, file, and exposure window.
3. Follow the organization's incident response plan, which PCI DSS 12.10 requires.

### Response targets

- **Acknowledgment:** within 48 hours.
- **Assessment:** within 5 business days, including severity and impact.
- **Fix:** within the remediation targets below.

## Remediation targets

These targets apply to vulnerabilities in this code and in its dependencies. Findings come from these sources:

- Semgrep, OSV-Scanner, and `pnpm audit` failures in CI;
- Dependabot alerts;
- ZAP reports and direct reports.

Severity follows CVSS v3.1 or v4.0.

| Severity | Fix or mitigate within |
| :------- | :--------------------- |
| Critical | 7 days                 |
| High     | 30 days                |
| Medium   | 90 days                |
| Low      | Next planned release   |

A finding that cannot be fixed in time needs a recorded risk acceptance with an owner and an expiry date. Record suppressions in `pnpm-workspace.yaml` (`audit.ignore`), `osv-scanner.toml`, or `.zap/rules.tsv`, each with a reason.
