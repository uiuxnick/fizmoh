import dns from "node:dns/promises"
import net from "node:net"

/**
 * Validate a server-side URL before fetching it. This is intentionally a
 * network-level check, not just a hostname blacklist: DNS names can resolve to
 * loopback, link-local, private, or unique-local addresses.
 */
function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase()
  if (net.isIPv4(normalized)) {
    const octets = normalized.split(".").map(Number)
    const [a, b] = octets
    return a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19))
  }

  if (!net.isIPv6(normalized)) return true
  if (normalized === "::" || normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  return mapped ? isPrivateAddress(mapped[1]) : false
}

export async function assertSafeHttpUrl(raw: string, options?: { allowHttp?: boolean }): Promise<URL> {
  const url = new URL(raw)
  const allowHttp = options?.allowHttp ?? true
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    throw new Error("Only HTTP(S) URLs are allowed")
  }
  const hostname = url.hostname.toLowerCase()
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".internal")) {
    throw new Error("Private network addresses are not allowed")
  }

  const addresses = net.isIP(hostname)
    ? [hostname]
    : (await dns.lookup(hostname, { all: true })).map(result => result.address)
  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw new Error("Private or reserved network addresses are not allowed")
  }
  return url
}
