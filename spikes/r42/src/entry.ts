// Is this module the program being run (rather than imported)? A local COPY of the idea in kiln/packages/record/src/entry.ts — the spike imports nothing
// from kiln/. Not `import.meta.main` (undefined on some supported Node versions) and not a bare `argv[1] === fileURLToPath(import.meta.url)`: through a
// symlinked directory (macOS temp dirs are /var → /private/var) the two differ and the command would run NOTHING and exit 0. Both sides are realpath'd.
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
