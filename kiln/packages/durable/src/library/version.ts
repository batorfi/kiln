// The installed library version, read from the package's own manifest (a JSON import; the specifier is one of the external seam's, boundaries.json).
import pkg from "@earendil-works/pi-durable/package.json" with { type: "json" };

export const INSTALLED_LIBRARY_VERSION: string = (pkg as { version: string }).version;
