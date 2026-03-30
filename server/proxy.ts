import { isIPv4 } from "net";
import { lookup } from "dns/promises";

export const BLOCKED_REASON = {
  PRIVATE_IP: "PRIVATE_IP",
  NOT_HTTPS: "NOT_HTTPS",
  INVALID_URL: "INVALID_URL",
} as const;

export type BlockedReason = (typeof BLOCKED_REASON)[keyof typeof BLOCKED_REASON];

const PRIVATE_RANGES = [
  { start: "10.0.0.0", end: "10.255.255.255" },
  { start: "172.16.0.0", end: "172.31.255.255" },
  { start: "192.168.0.0", end: "192.168.255.255" },
  { start: "127.0.0.0", end: "127.255.255.255" },
  { start: "169.254.0.0", end: "169.254.255.255" },
  { start: "0.0.0.0", end: "0.255.255.255" },
];

function ipToNum(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

function isPrivateIp(ip: string): boolean {
  if (!isIPv4(ip)) return true;
  const num = ipToNum(ip);
  return PRIVATE_RANGES.some(
    (range) => num >= ipToNum(range.start) && num <= ipToNum(range.end)
  );
}

export function proxyHandler(targetUrl: string): BlockedReason | null {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return BLOCKED_REASON.INVALID_URL;
  }

  if (parsed.protocol !== "https:") {
    return BLOCKED_REASON.NOT_HTTPS;
  }

  const hostname = parsed.hostname;

  if (isIPv4(hostname) && isPrivateIp(hostname)) {
    return BLOCKED_REASON.PRIVATE_IP;
  }

  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return BLOCKED_REASON.PRIVATE_IP;
  }

  return null;
}

export async function resolveAndCheck(hostname: string): Promise<boolean> {
  try {
    const result = await lookup(hostname);
    return !isPrivateIp(result.address);
  } catch {
    return true;
  }
}
