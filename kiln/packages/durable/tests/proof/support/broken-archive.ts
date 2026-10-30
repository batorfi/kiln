// A DELIBERATELY WEAKENED archive task, for the tests only (r15 T064): it compacts the feature BEFORE it has written and verified the archive — the order the design forbids. A failure (or a kill) after
// that leaves a feature whose contents are gone and for which no archive was ever recorded. E6 must name it.
import type { Services } from "#durable/services.ts";
import type { BriefDocData } from "#durable/gate/documents.ts";
import { archiveKind } from "#durable/record/archive-task.ts";
import { defineKilnTask, type TaskKind } from "#durable/store.ts";

export function brokenArchiveKind(s: Services, dir: string): TaskKind<any, any, any> {
  const real = archiveKind(s, dir) as TaskKind<any, any, any>;
  return defineKilnTask<any, any, any>({
    ...real,
    phases: {
      ...real.phases,
      export: async (task, run) => {
        // the weakness: compact first …
        const gates = (await s.store.docs<{ gateId?: string }>("kiln.gate")).filter((d) => d.key.startsWith(`gate:${task.input.feature}:`));
        await s.store.commit(async (tx) => {
          for (const g of gates) { const b = await tx.doc<BriefDocData & { archivedIn?: string }>("kiln.brief", g.key, {}); b.content = { archived: true }; b.archivedIn = "never-written.kiln-archive"; }
        });
        // … and only then do the real work
        return real.phases.export(task, run);
      },
    },
  });
}
