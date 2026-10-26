// Document families: one generic family per KILN document name, in the root conversation. `initial(seed)` returns the seed, so a caller creates a document from the value it passes.
import { defineDocFamily } from "@earendil-works/pi-durable";
import { DOC_NAMES, type DocName } from "../store.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DOC_TOKENS: Record<DocName, any> = Object.fromEntries(
  DOC_NAMES.map((name) => [
    name,
    defineDocFamily<Record<string, never>, Record<string, never>>({
      kind: name,
      version: 1,
      scope: "conversation",
      history: "latest",
      fork: "initial",
      family: true,
      initial: (seed) => structuredClone(seed),
      checkpointWhen: () => true,
    }),
  ]),
) as Record<DocName, never>;
