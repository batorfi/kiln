// The record, on the durable side (r15): append, read, references. The backbone, the consumers and the archive join in later stories.
export { appendEvent, EventRejected, CHUNK, type EventDraft, type RecordHead, type EventChunk, type RunIndex } from "./append.ts";
export { readRecord, readRun, headOf, collect, fromReader, interimView, type DocSource, type InterimView } from "./read.ts";
export { digestOf, pairOf, resolveRef, resolveChecked } from "./refs.ts";
