// Is this host a loopback address? Copied (not imported — new code never imports legacy) from the first program's src/ollama-resident.ts
// `isLoopbackHost` (r12 T060). The network lint uses it to refuse a non-loopback URL literal in an allowlisted module.
export function isLoopbackHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  if (h === "localhost" || h === "::1" || h === "[::1]") return true;
  const m = /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  return m !== null && m.slice(1).every((octet) => Number(octet) <= 255); // 127.999.999.999 is not an address (CR-12)
}
