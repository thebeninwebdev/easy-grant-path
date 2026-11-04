import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import ipaddr from "ipaddr.js";

const MAX_REDIRECTS = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml"]);

export interface ImageValidationResult {
  valid: boolean;
  finalUrl: string;
  contentType?: string;
  width?: number;
  height?: number;
  reasons: string[];
  cacheHit?: boolean;
}

type Address = { address: string; family: 4 | 6 };
type Cached = { expiresAt: number; result: ImageValidationResult };
const globalValidation = globalThis as typeof globalThis & { opportunityImageValidationCache?: Map<string, Cached> };
const validationCache = globalValidation.opportunityImageValidationCache ?? new Map<string, Cached>();
globalValidation.opportunityImageValidationCache = validationCache;

function parseUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch { return null; }
}

function publicAddress(address: string) {
  if (!ipaddr.isValid(address)) return false;
  const parsed = ipaddr.parse(address);
  if (parsed.kind() === "ipv6" && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) return (parsed as ipaddr.IPv6).toIPv4Address().range() === "unicast";
  return parsed.range() === "unicast";
}

async function resolveAddress(url: URL): Promise<Address | null> {
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) return null;
  const addresses = ipaddr.isValid(hostname)
    ? [{ address: hostname, family: ipaddr.parse(hostname).kind() === "ipv4" ? 4 : 6 } as Address]
    : await lookup(hostname, { all: true, verbatim: true }).catch(() => [] as Address[]) as Address[];
  if (!addresses.length || addresses.some((item) => !publicAddress(item.address))) return null;
  return addresses[0];
}

async function request(url: URL, pinned: Address) {
  const transport = url.protocol === "https:" ? https : http;
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }>((resolve, reject) => {
    const req = transport.request(url, {
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*;q=0.8", "User-Agent": "EasyGrantPath-ImageValidator/1.0" },
      lookup: (_hostname, options, callback) => {
        if (typeof options === "object" && options.all) callback(null, [pinned]);
        else callback(null, pinned.address, pinned.family);
      },
    }, (response) => {
      const declared = Number(response.headers["content-length"] ?? 0);
      if (declared > MAX_IMAGE_BYTES) { response.destroy(); reject(new Error("image exceeds maximum size")); return; }
      const chunks: Buffer[] = [];
      let received = 0;
      response.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (received > MAX_IMAGE_BYTES) response.destroy(new Error("image exceeds maximum size"));
        else chunks.push(chunk);
      });
      response.on("end", () => resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks) }));
      response.on("error", reject);
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error("image request timed out")));
    req.on("error", reject);
    req.end();
  });
}

function dimensions(body: Buffer, type: string) {
  if (type === "image/png" && body.length >= 24 && body.subarray(1, 4).toString() === "PNG") return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
  if (type === "image/gif" && body.length >= 10) return { width: body.readUInt16LE(6), height: body.readUInt16LE(8) };
  if (type === "image/webp" && body.length >= 30 && body.subarray(12, 16).toString() === "VP8X") return { width: 1 + body.readUIntLE(24, 3), height: 1 + body.readUIntLE(27, 3) };
  if (type === "image/jpeg") {
    let offset = 2;
    while (offset + 8 < body.length) {
      if (body[offset] !== 0xff) { offset += 1; continue; }
      const marker = body[offset + 1];
      const length = body.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return { width: body.readUInt16BE(offset + 7), height: body.readUInt16BE(offset + 5) };
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  if (type === "image/svg+xml") {
    const text = body.toString("utf8", 0, Math.min(body.length, 512_000));
    const viewBox = text.match(/viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/i);
    const width = text.match(/\bwidth=["']([\d.]+)/i);
    const height = text.match(/\bheight=["']([\d.]+)/i);
    return { width: Number(width?.[1] ?? viewBox?.[1]) || undefined, height: Number(height?.[1] ?? viewBox?.[2]) || undefined };
  }
  return {};
}

export function isUnsafeSvgContent(value: string | Buffer) {
  const text = (typeof value === "string" ? value : value.toString("utf8")).slice(0, 512_000);
  return /<script\b|\bon\w+\s*=|javascript:|<foreignObject\b|(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/)/i.test(text);
}

function invalid(finalUrl: string, reason: string): ImageValidationResult {
  return { valid: false, finalUrl, reasons: [reason] };
}

export async function validateImageAsset(value: string): Promise<ImageValidationResult> {
  const cached = validationCache.get(value);
  if (cached && cached.expiresAt > Date.now()) return { ...cached.result, cacheHit: true };
  const initial = parseUrl(value);
  if (!initial) return invalid(value, "invalid image URL");
  let current = initial;
  try {
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const address = await resolveAddress(current);
      if (!address) return invalid(current.toString(), "private or restricted network target");
      const response = await request(current, address);
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (!response.headers.location || redirect === MAX_REDIRECTS) return invalid(current.toString(), "invalid or excessive redirect");
        const next = parseUrl(new URL(response.headers.location, current).toString());
        if (!next) return invalid(current.toString(), "redirected to an unsupported URL");
        current = next;
        continue;
      }
      if (response.status < 200 || response.status >= 300) return invalid(current.toString(), "broken image response (" + response.status + ")");
      const contentType = String(response.headers["content-type"] ?? "").split(";", 1)[0].trim().toLowerCase();
      if (!ALLOWED_TYPES.has(contentType)) return invalid(current.toString(), "unsupported image content type");
      if (!response.body.length) return invalid(current.toString(), "empty image response");
      if (contentType === "image/svg+xml" && isUnsafeSvgContent(response.body)) return invalid(current.toString(), "unsafe SVG content");
      const size = dimensions(response.body, contentType);
      const logoLike = Boolean(size.width && size.height && size.width / size.height >= 0.65 && size.width / size.height <= 1.55);
      if (size.width && size.height && (size.width < 80 || size.height < 40 || size.width * size.height < 10_000) && !logoLike) return invalid(current.toString(), "image resolution is too small");
      const result: ImageValidationResult = {
        valid: true,
        finalUrl: current.toString(),
        contentType,
        ...size,
        reasons: [
          "public URL and redirect chain validated",
          "supported content type: " + contentType,
          size.width && size.height ? "dimensions validated: " + size.width + "x" + size.height : "dimensions unavailable; format and size are bounded",
        ],
      };
      validationCache.set(value, { expiresAt: Date.now() + 24 * 60 * 60 * 1_000, result });
      return result;
    }
  } catch (error) {
    return invalid(current.toString(), error instanceof Error ? error.message : "image validation failed");
  }
  return invalid(current.toString(), "image validation failed");
}

export function clearImageValidationCache() {
  validationCache.clear();
}
