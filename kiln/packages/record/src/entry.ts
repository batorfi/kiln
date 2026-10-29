// Is this module the program being run (rather than imported)? Used by every command-line entry point.
//
// Not `import.meta.main` (undefined before Node 24.2, so on 24.1, the floor of the declared engines range), and not a bare
// `process.argv[1] === fileURLToPath(import.meta.url)` either: `import.meta.url` is a resolved real path while `argv[1]` is as typed, so
// through a symlinked directory (macOS temp dirs are `/var` → `/private/var`) they differ and the command would run NOTHING and exit 0.
// Both sides are resolved with realpath. A guard that cannot tell must say no rather than throw — and callers print usage when argv is empty.
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function isEntryPoint(metaUrl: string, argv1: string | undefined = process.argv[1]): boolean {
  if (argv1 === undefined) return false;
  try {
    return realpathSync(fileURLToPath(metaUrl)) === realpathSync(argv1);
  } catch {
    return false;
  }
}
