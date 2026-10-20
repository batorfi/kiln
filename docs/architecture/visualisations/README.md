# Architecture visualisations

## KILN — platform architecture

![KILN platform architecture](kiln-platform-architecture.png)

Five layers — **people and clients**, the **workshop**, the **host**, the **factory** and the **substrate and external
systems** — with the **team space** and the cross-cutting concerns (configuration, policy and egress, security and
identity, observability) beside them. Twenty-five numbered connections, coloured by kind: decisions and commands, events
and views, model inference and residency, coordination and external systems. Thick borders mark the key components.

Explained in prose in [`../explainers/kiln-architecture.md`](../explainers/kiln-architecture.md). Illustrative, not a
design decision; the concept documents and the PRD govern where they differ.

Regenerate (4000 × 3090 px) — the connections are drawn by a script in the page from the boxes' positions:

```sh
cd src && "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=2000,1545 --virtual-time-budget=2000 \
  --screenshot=../kiln-platform-architecture.png "file://$PWD/kiln-platform-architecture.html"
```
