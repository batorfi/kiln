// The experience events the row names (FR-011): the charter and the design system, approved and amended. Schemas and tests only; the setup artifacts that emit them are later rows'.
import { entry, hexDigest, nonEmpty, obj, type CatalogEntry } from "./builder.ts";

const artifact = obj({ version: nonEmpty, digest: hexDigest, by: nonEmpty });
export const experienceEntries: CatalogEntry[] = ["charter.approved", "charter.amended", "design-system.approved", "design-system.amended"].map((t) => entry(t, artifact, false));
