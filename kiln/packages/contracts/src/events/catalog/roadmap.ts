// Program and roadmap (FR-010): the Roadmap gate's decisions and amendments of the program. Rows are named by a digest, never inlined.
import { entry, hexDigest, nonEmpty, obj, oneOfStr, type CatalogEntry } from "./builder.ts";

export const roadmapEntries: CatalogEntry[] = [
  entry("roadmap.amended", obj({ rowsDigest: hexDigest, by: nonEmpty }), false),
  entry("roadmap-gate.decided", obj({ decision: oneOfStr("approve", "revise", "reject", "edit-rows", "add-row", "drop-row"), by: nonEmpty, rowsDigest: hexDigest }, ["decision", "by"]), false),
];
