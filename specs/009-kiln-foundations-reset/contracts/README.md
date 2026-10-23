# Contracts: Foundations reset (row r12)

The interfaces r12 exposes — to people (the `kiln check` command and the test runner) and to the rows that build on it (the flow definitions, the
validators, the rule files). r12 has no network or file-format interface beyond these.

| Contract | What it fixes | Consumers |
|---|---|---|
| [cli-check.md](./cli-check.md) | the `kiln check` command: names, output, exit codes | people; r14 (`flow`), r17 (`config`, `model`) |
| [flow-and-records.md](./flow-and-records.md) | the flow definitions' API, the `flow` field, the validator API and G3 message | r14, r15 |
| [boundaries.md](./boundaries.md) | `boundaries.json`, import classification, failure names | every later row (they extend the file in the diff that needs it) |
| [legacy-identity.md](./legacy-identity.md) | the manifest, the copy record, failure names | reviewers; the retirement work |
| [runner.md](./runner.md) | the test runner CLI and the Pi tier decision | people; CI later |

**Stable failure names.** Every check fails by a name (FR-018) that tests assert on and docs may cite: `network-call`, `network-import`,
`network-alias`, `network-computed`, `network-zero-files`, `allowlist-missing-file`, `allowlist-bare-name`, `boundary-forbidden-import`,
`boundary-bare-specifier`, `boundary-legacy-import`, `boundary-contracts-io`, `boundary-package-undeclared`, `boundary-responsibility-missing`,
`boundary-zero-files`, `legacy-file-modified`, `legacy-file-missing`, `legacy-file-added`, `legacy-baseline-mismatch` (raised by a test, not the command), `legacy-copy-unlisted`, `legacy-zero-files`,
`pi-version-unmeasured` (legacy, unchanged). A name is never reused for a different meaning.
