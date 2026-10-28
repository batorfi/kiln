// Grammar of an event's identifying fields and the keys an event may never carry (FR-004, FR-006; data-model §1). Pure.
// A person is `<token>@<token>` (`human@batorfi`, `person@example`): r13 accepted any non-blank decider, and identity (who a token is) is a later row's. The log validator's own `^human@` stays the test of a HUMAN.
export const ACTOR_PATTERN = /^([A-Za-z0-9._-]+@[A-Za-z0-9._-]+|director|system|factory|task:[0-9]+|role:[a-z-]+@\S+|delegation:\S+|script:[A-Za-z0-9._-]+)$/;
export const isActor = (s: unknown): s is string => typeof s === "string" && ACTOR_PATTERN.test(s);

export const CAUSATION_PATTERN = /^(cmd:.+|evt:[1-9][0-9]*)$/;
export const isCausation = (s: unknown): s is string => typeof s === "string" && CAUSATION_PATTERN.test(s);

/** Content: what the record never holds (R4). Remote: the first program's forbidden endpoint keys (R5). */
export const CONTENT_KEYS: readonly string[] = ["prompt", "answer", "transcript", "note", "text", "content", "body", "code"];
export const REMOTE_KEYS: readonly string[] = ["url", "http", "https", "cloud", "remote", "endpoint", "apiBase", "baseUrl", "externalUrl"];
export const FORBIDDEN_KEYS: readonly string[] = [...CONTENT_KEYS, ...REMOTE_KEYS];

/** The first forbidden key anywhere in a JSON value (depth-first, keys in insertion order), with its path — or null. Matching is by exact, case-sensitive key. */
export function findForbiddenKey(value: unknown, path = "data"): { key: string; path: string } | null {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findForbiddenKey(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  for (const [k, v] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.includes(k)) return { key: k, path: `${path}.${k}` };
    const hit = findForbiddenKey(v, `${path}.${k}`);
    if (hit) return hit;
  }
  return null;
}

// ── references to text kept elsewhere in the store ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export type RefLocator =
  | { kind: "move"; gateId: string }
  | { kind: "feature-move"; feature: string; key: string }
  | { kind: "triage"; feature: string };

/** `move:<gateId>#note` · `walk:<feature>/moves/<key>#note` · `row:<feature>#triage.reasoning` */
export function refString(r: RefLocator): string {
  return r.kind === "move" ? `move:${r.gateId}#note` : r.kind === "feature-move" ? `walk:${r.feature}/moves/${r.key}#note` : `row:${r.feature}#triage.reasoning`;
}
export function parseRef(s: string): RefLocator | null {
  let m = /^move:(.+)#note$/.exec(s);
  if (m) return { kind: "move", gateId: m[1] };
  m = /^walk:([^/]+)\/moves\/(.+)#note$/.exec(s);
  if (m) return { kind: "feature-move", feature: m[1], key: m[2] };
  m = /^row:(.+)#triage\.reasoning$/.exec(s);
  if (m) return { kind: "triage", feature: m[1] };
  return null;
}

/** "run:<feature>" from a subject: a gate id `gate:<feature>:…` yields its feature; `lane`/`factory` yield null; any other non-empty subject is taken as a feature name. */
export function correlationOf(subject: string): string | null {
  if (subject === "lane" || subject === "factory" || subject === "") return null;
  const m = /^gate:([^:]+):/.exec(subject);
  return `run:${m ? m[1] : subject}`;
}
