# r42 — Devices and remote work

> **Roadmap row r42** · phase: kiln-v1.x · release: `kiln-v1.x` (after the release) · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Let engineers work from any device, anywhere, safely: devices paired with their own keys, remote access over private networks only, step-up for high-stakes moves, revocation, content-free notifications, per-device content limits, offline reading and queued moves refused when stale.

## What it delivers

- pairing by QR and code phrase; device classes and limits
- remote access off by default; loopback, LAN or a private overlay network; never the public internet
- step-up for high-stakes moves; the device recorded with every move
- revocation that erases cached data; session expiry by class
- content-free notifications through channels the person chooses
- offline cache and queued moves; continuity across devices; waking a sleeping workshop

## Why it exists

- Engineers move between workstation, notebook, tablet and phone; the factory should not wait longer than it has to (`devices-and-remote-work.md`).
- No KILN cloud: devices reach the person's own workshop (constitution VIII).

## Why it sits here

- **Depends on:** [r32](r32-kiln-v1-release.md), [r37](r37-factories-anywhere.md)
- **Unlocks:** — (nothing depends on it)

After the release and factories anywhere (r37), which brings authenticated channels and sleeping-host handling.

## How it is proven

**Acceptance:** A phone paired by QR decides a small gate over a private network with the full brief; a queued offline move on a changed gate is refused.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

DEV-1…9 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Decisions before it starts

- A KILN-shipped private network or only the engineer's own; a native mobile app; moves impossible from companion devices (PRD §14)

## Risks

- A lost phone. Mitigation: device keys, step-up, instant revocation and cache erasure.

## Read more

- [Devices and remote work](../../docs/concepts/devices-and-remote-work.md)
- [Mockups 73–77](../../docs/concepts/mockups/README.md)
