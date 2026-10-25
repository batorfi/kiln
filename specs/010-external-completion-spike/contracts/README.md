# Contracts: Spike — completing a waiting task from outside (row r42)

The spike exposes no product interface. It has three contracts, each a promise to a reader:

| Contract | For whom | What it fixes |
|---|---|---|
| [gate-completion-port.md](./gate-completion-port.md) | the engineer starting r13 (and the spike's own strategies) | the operations, outcomes, refusals and invariants of "a move completes a waiting gate", **in KILN's terms** — the thing the report hands over and that must not depend on the library's API (CORE-6) |
| [spike-report.md](./spike-report.md) | the Operator at the Roadmap gate | the sections the report must have, and the rules that turn evidence into one of three verdicts |
| [evidence-cli.md](./evidence-cli.md) | anyone reproducing the evidence | the commands, flags, exit codes and never-vacuous rules of `spikes/r42` |

Failure and refusal codes are stable names, as in r12's `contracts/cli-check.md`.
