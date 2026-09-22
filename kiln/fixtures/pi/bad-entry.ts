// kiln/fixtures/pi/bad-entry.ts — T033, r8. Deliberately WRONG in exactly one way: no default-exported function (a plain object instead).
// Used by PiReady's `--bad-entry` falsify hook to prove it fails as `extension-load-error`, never a pass and never a hang.
export default { notAFunction: true };
