// T025 — is the pinned dependency really what is installed? A run on a different version proves nothing about the pinned one, so a mismatch is a
// NAMED failure (`evidence-install-mismatch`), not a surprise three minutes into a scenario. Reads three files and nothing else.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const PINNED = { name: "@earendil-works/pi-durable", version: "1.4.0" } as const;
const defaultRoot = fileURLToPath(new URL("..", import.meta.url));

export class InstallMismatch extends Error {
  readonly code = "evidence-install-mismatch";
}

export interface InstallInfo {
  name: string;
  version: string;
  integrity: string;
}

function readJson(path: string, what: string): any {
  if (!existsSync(path)) throw new InstallMismatch(`${what} is missing (${path}); run \`npm ci\` in spikes/r42`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new InstallMismatch(`${what} is not valid JSON: ${(e as Error).message}`);
  }
}

export function checkInstall(root: string = defaultRoot): InstallInfo {
  const pkg = readJson(join(root, "package.json"), "package.json");
  const range = pkg.dependencies?.[PINNED.name];
  if (range !== PINNED.version) throw new InstallMismatch(`package.json pins ${PINNED.name} as ${JSON.stringify(range)}; it must be exactly "${PINNED.version}" (no ^ or ~)`);
  const lock = readJson(join(root, "package-lock.json"), "package-lock.json");
  const locked = lock.packages?.[`node_modules/${PINNED.name}`];
  if (!locked || locked.version !== PINNED.version) throw new InstallMismatch(`package-lock.json records ${PINNED.name}@${locked?.version ?? "(nothing)"}; expected ${PINNED.version}`);
  const installed = readJson(join(root, "node_modules", PINNED.name, "package.json"), `node_modules/${PINNED.name}`);
  if (installed.version !== PINNED.version) throw new InstallMismatch(`node_modules has ${PINNED.name}@${installed.version}; expected ${PINNED.version}; run \`npm ci\``);
  return { name: PINNED.name, version: installed.version, integrity: String(locked.integrity ?? "") };
}
