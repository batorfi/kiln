// kiln/fixtures/pi/no-command.ts — T033, r8. Deliberately WRONG in exactly one way: registers only `kiln-status`, never `kiln-selftest`.
// Used by PiReady's `--no-command` falsify hook to prove `command-missing` is reported.
import { makeKilnExtension } from "../../pi/index.ts";

export default function (pi: any): void {
  // Wrap the real factory's registerCommand to drop kiln-selftest — exercising the REAL status handler, only hiding one command.
  const filtered = {
    registerCommand: (name: string, options: unknown) => {
      if (name === "kiln-selftest") return;
      pi.registerCommand(name, options);
    },
  };
  makeKilnExtension()(filtered as any);
}
