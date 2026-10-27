// The usage text of the owner and gate commands. Kept apart from gate-commands.ts so that `kiln check` can print it without loading the durable package (and, through it, the library).
export const GATE_USAGE = `usage: kiln owner --store <dir>
       kiln gate open  --store <dir> --key <k> --gate <id> --gate-key <g> --flow v1|v2 --brief <file.json> [--by <who>]
       kiln gate move  --store <dir> --gate <id> --key <k> --kind <kind> --by <decider> --brief-ref <hash>
       kiln gate state --store <dir> --gate <id>`;
