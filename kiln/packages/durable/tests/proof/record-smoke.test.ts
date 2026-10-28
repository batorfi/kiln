// r15 T035 (DEFAULT tier): one kill in the middle of an event's commit per scripted walk, judged by a fresh reader with the record's invariants. The full matrix is record-kill-points.proof.test.ts.
import { test } from "node:test";
import { killRun, INTERFACE, PLAIN } from "./support/walk-judge.ts";

test("plain walk killed mid-commit of an event (hit 5): the record is whole and the walk equals the uninterrupted one", { timeout: 120_000 }, () => killRun("plain", PLAIN, "record.append-after-write", 5));
test("interface walk killed mid-commit of an event (hit 30): the record is whole and the walk equals the uninterrupted one", { timeout: 120_000 }, () => killRun("interface", INTERFACE, "record.append-after-write", 30));
