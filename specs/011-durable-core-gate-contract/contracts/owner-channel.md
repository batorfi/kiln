# Contract: the owner's local channel and the CLI client

**Spec**: FR-017, FR-041 … FR-046, SC-007 · **Research**: R5, R6

The channel is how **another process** (the CLI today, the web server of r19/r20 later) hands the owner a command. It is a **private local socket**, not a network service: no TCP or UDP port is ever held (constitution VIII/IX), and a lint rule says so.

## Transport

- **Unix-domain socket** at `<tmp>/kiln-<uid>/<sha1(realpath(store))[0..8]>.sock`; the directory `0700`, the socket `0600`. **Safe directory rule:** if the directory already exists it must be a real directory (not a symlink), owned by the current user, mode exactly `0700`; otherwise the owner refuses to serve with `ChannelUnsafe` naming the path and the problem. The same for the socket file. A pre-created path is never trusted. The path is recorded in `<store>/owner.lock`. A stale socket file left by a SIGKILL is removed by the next owner under the lock.
- **Framing**: one JSON object per line, both ways. A request carries an integer `id`; the reply echoes it. Several requests may be in flight on one connection.

## Requests and replies

| `op` | Request fields | Reply `result` |
|---|---|---|
| `ping` | — | `{ pong: true, ready: boolean, pid }` — answered even before the factory is ready |
| `ready` | — | `{ ready: boolean }` |
| `gate.open` | `key`, `spec` | an `OpenOutcome` |
| `gate.move` | `gateId`, `key`, `move` | an `Outcome` |
| `gate.state` | `gateId` | a `GateState` |

A reply is `{ id, ok: true, result }`, or `{ id, ok: false, error }` for a malformed request (`bad-request: …`). Domain refusals are **results** (`ok: true`, `result: { status: "refused", reason, … }`), exactly the contract's vocabulary; nothing is added or renamed in transit. Between listening and `ready`, every mutating op answers `refused(not-ready)`.

## Client behaviour (library and CLI)

- A request whose connection is lost, or that gets no answer within **5 s**, resolves to `refused(store-error)` with `detail: "connection-lost" | "timeout"` — **outcome unknown**; the caller retries the same key. A client never hangs and never opens the store.
- A second owner cannot be started on a live channel; `openFactory` refuses with `StoreOwned`.

## The thin CLI (`kiln`, FR-046)

```text
kiln owner   --store <dir>                       # open the factory, serve the channel, print "listening" then "ready", run until SIGTERM
kiln gate open  --store <dir> --key <k> --gate <id> --gate-key <g> --flow v2 --brief <file.json> [--by <who>]
kiln gate move  --store <dir> --gate <id> --key <k> --kind <kind> --by <decider> --brief-ref <hash>
kiln gate state --store <dir> --gate <id>
```

Output is one JSON line (the result); exit `0` for any answered request (a refusal is an answer), `3` when the owner cannot be reached, `4` for outcome unknown, `2` for usage errors. `kiln check` is unchanged. Listing gates and showing a brief are **out of scope** (spec FR-046).

## What the proof asserts about it

20 attempts to own an owned store → 20 refusals naming the owner; 50 concurrent starters on a stale lock → exactly one owner; a completer that is a separate process reaches every outcome of the gate contract; `lsof -nP -a -i -p <ownerPid>` lists **no** network socket while serving, after a kill, and after a restart. A pre-created symlink, a wrong-mode directory and a directory owned by someone else (unit-tested over a stat result) are each refused with `ChannelUnsafe`.
