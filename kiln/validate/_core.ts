// kiln/validate/_core.ts — T004 (Foundational)
//
// A dependency-light, deterministic validator supporting the subset of JSON
// Schema Draft 2020-12 used by kiln/schemas/*. Per P-VIII (research §B/§G) the
// module pulls NO third-party library. Keywords supported:
//   type, const, enum, pattern, minimum, maximum, minLength,
//   format: date-time (lenient ISO-8601),
//   required, properties, additionalProperties (bool|schema), items,
//   $ref (#/... internal), oneOf, allOf, if/then/else, not.
//
// validate() returns a list of human-readable error paths (empty ⇒ valid).

export type Json = unknown;
export type Schema = Record<string, unknown> | any;
export interface ValidationError {
  path: string;
  message: string;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isInteger(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v);
}
// Lenient ISO-8601 date-time: accept a non-empty string with a digit; full
// strictness is out of scope for a zero-dep first slice.
function isDateTime(v: unknown): boolean {
  return typeof v === "string" && v.length > 0 && /\d{4}-\d{2}-\d{2}/.test(v);
}

function resolveRef(ref: string, root: Schema): Schema {
  // Only internal refs of the form "#/a/b/c".
  if (!ref.startsWith("#/")) throw new Error(`unsupported $ref (external refs are out of scope): ${ref}`);
  const parts = ref
    .slice(2)
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
  let node: unknown = root;
  for (const part of parts) {
    if (!isObject(node) || !(part in (node as object))) throw new Error(`unresolved $ref: ${ref}`);
    node = (node as Record<string, unknown>)[part];
  }
  return node as Schema;
}

export function validate(
  instance: unknown,
  schema: Schema,
  root: Schema = schema,
  path = "$",
): ValidationError[] {
  let errors: ValidationError[] = [];
  if (Array.isArray(schema)) {
    return errors; // no-op (empty schema)
  }
  const s = schema as Record<string, unknown>;

  // $ref wins.
  if (typeof s.$ref === "string") {
    return validate(instance, resolveRef(s.$ref, root), root, path);
  }

  // Combinators.
  if (s.allOf) errors = errors.concat((s.allOf as Schema[]).flatMap((sub) => validate(instance, sub, root, path)));
  if (Array.isArray(s.oneOf)) {
    const branches = s.oneOf as Schema[];
    const matches = branches.map((sub) => validate(instance, sub, root, path));
    const passCount = matches.filter((e) => e.length === 0).length;
    if (passCount !== 1) {
      errors.push({
        path,
        message: `oneOf: expected exactly 1 matching branch, got ${passCount} of ${branches.length}`,
      });
    }
  }
  if (s.not) {
    const notErrors = validate(instance, s.not as Schema, root, path);
    if (notErrors.length === 0) errors.push({ path, message: "not: value matched a schema it must not" });
  }
  if (s.if) {
    const ifErrors = validate(instance, s.if as Schema, root, path);
    if (ifErrors.length === 0) {
      errors = errors.concat(validate(instance, (s.then ?? { type: "object" }) as Schema, root, path));
    } else if (s.else) {
      errors = errors.concat(validate(instance, s.else as Schema, root, path));
    }
  }

  // type
  switch (s.type) {
    case "object":
      if (!isObject(instance)) {
        errors.push({ path, message: "expected object" });
        return errors;
      }
      break;
    case "array":
      if (!Array.isArray(instance)) {
        errors.push({ path, message: "expected array" });
        return errors;
      }
      break;
    case "integer":
      if (!isInteger(instance)) {
        errors.push({ path, message: "expected integer" });
        return errors;
      }
      break;
    case "number":
      if (typeof instance !== "number") {
        errors.push({ path, message: "expected number" });
        return errors;
      }
      break;
    case "string":
      if (typeof instance !== "string") {
        errors.push({ path, message: "expected string" });
        return errors;
      }
      break;
    case "boolean":
      if (typeof instance !== "boolean") {
        errors.push({ path, message: "expected boolean" });
        return errors;
      }
      break;
    case "null":
      if (instance !== null) {
        errors.push({ path, message: "expected null" });
        return errors;
      }
      break;
    default:
      break;
  }

  // const / enum
  if (s.const !== undefined && !deepEq(instance, s.const)) {
    errors.push({ path, message: `expected const ${JSON.stringify(s.const)}` });
  }
  if ("enum" in s && !Array.isArray(s.enum)) {
    errors.push({ path, message: "enum must be an array of schemas" });
  } else if (Array.isArray(s.enum)) {
    if (!(s.enum as unknown[]).some((c) => deepEq(instance, c))) {
      errors.push({ path, message: `expected one of [${(s.enum as unknown[]).map((c) => JSON.stringify(c)).join(", ")}]` });
    }
  }

  // string constraints
  if (typeof instance === "string") {
    if (typeof s.pattern === "string" && !new RegExp(s.pattern).test(instance)) {
      errors.push({ path, message: `does not match pattern /${s.pattern}/` });
    }
    if (typeof s.minLength === "number" && instance.length < s.minLength) {
      errors.push({ path, message: `shorter than minLength ${s.minLength}` });
    }
  }
  // number constraints
  if (isInteger(instance) || (typeof instance === "number" && s.type !== "string")) {
    if (typeof s.minimum === "number" && instance < s.minimum) {
      errors.push({ path, message: `below minimum ${s.minimum}` });
    }
    if (typeof s.maximum === "number" && instance > s.maximum) {
      errors.push({ path, message: `above maximum ${s.maximum}` });
    }
  }
  // format
  if (typeof s.format === "string" && s.format === "date-time" && instance !== undefined) {
    if (!isDateTime(instance)) errors.push({ path, message: "expected ISO-8601 date-time (format)" });
  }

  // object keywords
  if (isObject(instance)) {
    const props = instance as Record<string, unknown>;
    if (Array.isArray(s.required)) {
      for (const req of s.required as string[]) {
        if (!(req in props)) errors.push({ path: `${path}.${req}`, message: "missing required property" });
      }
    }
    if (isObject(s.properties)) {
      for (const [key, sub] of Object.entries(s.properties as Record<string, Schema>)) {
        if (key in props) errors = errors.concat(validate(props[key], sub, root, `${path}.${key}`));
      }
    }
    if (s.additionalProperties === false && isObject(s.properties)) {
      const allowed = new Set(Object.keys(s.properties as Record<string, unknown>));
      for (const key of Object.keys(props)) {
        if (!allowed.has(key)) errors.push({ path: `${path}.${key}`, message: "additional property not allowed" });
      }
    } else if (isObject(s.additionalProperties)) {
      const allowed = new Set(Object.keys(isObject(s.properties) ? s.properties : {}));
      for (const [key, val] of Object.entries(props)) {
        if (!allowed.has(key)) errors = errors.concat(validate(val, s.additionalProperties, root, `${path}.${key}`));
      }
    }
  }

  // array keywords
  if (Array.isArray(instance) && isObject(s.items)) {
    for (let i = 0; i < instance.length; i++) {
      errors = errors.concat(validate(instance[i], s.items as Schema, root, `${path}[${i}]`));
    }
  }

  return errors;
}

function deepEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object") {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = a as Record<string, unknown>,
      kb = b as Record<string, unknown>;
    if (JSON.stringify(ka) === JSON.stringify(kb)) return true;
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

export function isValid(instance: unknown, schema: Schema): boolean {
  return validate(instance, schema).length === 0;
}
