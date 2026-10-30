// r15 T024 — writes kiln/schemas/events/<type>.<n>.json from the catalog. `kiln check record` fails when the committed files differ from this output.
//   node tests/tools/gen-event-schemas.ts
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { catalog, schemaFiles } from "#contracts/events/catalog/index.ts";

const dir = fileURLToPath(new URL("../../schemas/events/", import.meta.url));
mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) if (f.endsWith(".json")) rmSync(`${dir}${f}`);
const files = schemaFiles(catalog);
for (const [name, text] of Object.entries(files)) writeFileSync(`${dir}${name}`, text);
console.log(`wrote ${Object.keys(files).length} schemas to schemas/events/`);
