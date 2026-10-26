// Canonical JSON and the hashes built on it: the identity of a brief (`briefRef`) and of a request (`requestHash`, the command ledger's conflict test).
// Pure: node:crypto only. Key order and whitespace never change a hash; different content always does.
import { createHash } from "node:crypto";
import type { JSON } from "./types.ts";

/** Stable JSON text: object keys sorted, no whitespace. Throws on anything that is not plain JSON (undefined, functions, NaN, Infinity, symbols, bigint, class instances, cycles). */
export function canonicalJson(value: unknown): string {
  const seen = new Set<unknown>();
  const walk = (v: unknown): string => {
    if (v === null) return "null";
    switch (typeof v) {
      case "boolean": return v ? "true" : "false";
      case "string": return globalThis.JSON.stringify(v);
      case "number":
        if (!Number.isFinite(v)) throw new TypeError(`not JSON: ${String(v)}`);
        return globalThis.JSON.stringify(v);
      case "object": {
        if (seen.has(v)) throw new TypeError("not JSON: a cycle");
        seen.add(v);
        try {
          if (Array.isArray(v)) return `[${v.map(walk).join(",")}]`;
          const proto = Object.getPrototypeOf(v);
          if (proto !== Object.prototype && proto !== null) throw new TypeError("not JSON: a non-plain object");
          const keys = Object.keys(v as object).sort();
          return `{${keys.map((k) => `${globalThis.JSON.stringify(k)}:${walk((v as Record<string, unknown>)[k])}`).join(",")}}`;
        } finally {
          seen.delete(v);
        }
      }
      default: throw new TypeError(`not JSON: ${typeof v}`);
    }
  };
  return walk(value);
}

export const sha256Hex = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");
/** The identity of a brief: the hash of its canonical content. */
export const briefRef = (content: JSON): string => sha256Hex(canonicalJson(content));
/** The identity of a request, for the command ledger: kind + request. */
export const requestHash = (kind: string, request: JSON): string => sha256Hex(canonicalJson({ kind, request }));
