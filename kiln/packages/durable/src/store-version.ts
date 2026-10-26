// The store-version guard (FR-047, research R14): pure comparison, so it can be tested without a second library version.
import { StoreVersionMismatch } from "./types.ts";

/** Throws `StoreVersionMismatch` unless the version recorded when the store was created is EXACTLY the installed one (a patch difference refuses too). */
export function checkStoreVersion(store: string, recorded: string | null | undefined, installed: string): void {
  if (recorded !== installed) throw new StoreVersionMismatch(store, recorded ?? "(none recorded)", installed);
}
/** The shape of the one `kiln.store` document. */
export interface StoreRecord {
  libraryVersion: string;
  contract: 1;
  createdAt: number;
}
export const STORE_CONTRACT = 1 as const;
