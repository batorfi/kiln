// The flag parsing shared by the owner/gate/feature commands: `--name value` pairs only (no bare flags), and a check that the required ones are there. Pure.
export function flags(args: string[]): Record<string, string> | { error: string } {
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const a = args[i];
    if (!a.startsWith("--") || args[i + 1] === undefined) return { error: `bad argument "${a}"` };
    out[a.slice(2)] = args[i + 1];
  }
  return out;
}
export const need = (f: Record<string, string>, names: string[]): string | null => {
  const missing = names.filter((n) => f[n] === undefined);
  return missing.length ? `missing ${missing.map((n) => `--${n}`).join(", ")}` : null;
};
