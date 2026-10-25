// kiln/fixtures/pi/throws-on-load.ts — T033, r8. Deliberately WRONG in exactly one way: the factory THROWS when Pi runs it.
// Used by PiReady's `--throw-on-load` falsify hook to prove `extension-load-error` is reported WITHOUT hanging (SC-004).
export default function (): void {
  throw new Error("fixture: throws-on-load deliberately throws when Pi invokes the factory");
}
