import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import ipaddr from "ipaddr.js";
import { AppError } from "@/lib/errors";
import type { FetchedPage } from "./types";

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const ALLOWED_CONTENT_TYPES = ["text/html", "application/xhtml+xml", "text/plain"];

type ResolvedAddress = { address: string; family: 4 | 6 };

function normalizeHostname(hostname: string) {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

function isPublicAddress(address: string) {
  if (!ipaddr.isValid(address)) return false;
  const parsed = ipaddr.parse(address);
  if (parsed.kind() === "ipv6" && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
    return (parsed as ipaddr.IPv6).toIPv4Address().range() === "unicast";
  }
  return parsed.range() === "unicast";
}

async function resolvePublicAddress(url: URL): Promise<ResolvedAddress> {
  const hostname = normalizeHostname(url.hostname);
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new AppError("This URL points to a local or private host and cannot be fetched.", "BLOCKED_URL", 400);
  }

  let addresses: ResolvedAddress[];
  if (ipaddr.isValid(hostname)) {
    const parsed = ipaddr.parse(hostname);
    addresses = [{ address: hostname, family: parsed.kind() === "ipv4" ? 4 : 6 }];
  } else {
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true }) as ResolvedAddress[];
    } catch {
      throw new AppError("The opportunity website could not be found.", "URL_DNS_FAILED", 422);
    }
  }

  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new AppError("This URL resolves to a private or restricted network and cannot be fetched.", "BLOCKED_URL", 400);
  }
  return addresses[0];
}

function parseHttpUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError("Enter a valid opportunity URL.", "VALIDATION_ERROR", 400);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError("Only http and https URLs can be fetched.", "VALIDATION_ERROR", 400);
  }
  if (url.username || url.password) {
    throw new AppError("URLs containing credentials cannot be fetched.", "BLOCKED_URL", 400);
  }
  return url;
}

async function requestPage(url: URL, pinned: ResolvedAddress): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  const transport = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const request = transport.request(url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.8",
        "User-Agent": "EasyGrantPath-OpportunityExtractor/1.0",
      },
      lookup: (_hostname, options, callback) => {
        if (typeof options === "object" && options.all) callback(null, [pinned]);
        else callback(null, pinned.address, pinned.family);
      },
    }, (response) => {
      const declaredLength = Number(response.headers["content-length"] ?? 0);
      if (declaredLength > MAX_RESPONSE_BYTES) {
        response.destroy();
        reject(new AppError("The page is too large to read automatically.", "RESPONSE_TOO_LARGE", 413));
        return;
      }

      const chunks: Buffer[] = [];
      let received = 0;
      response.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (received > MAX_RESPONSE_BYTES) {
          response.destroy(new AppError("The page is too large to read automatically.", "RESPONSE_TOO_LARGE", 413));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks) }));
      response.on("error", reject);
    });
    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(new AppError("The website took too long to respond.", "URL_TIMEOUT", 504)));
    request.on("error", reject);
    request.end();
  });
}

export async function fetchOpportunityPage(input: string): Promise<FetchedPage> {
  const requestedUrl = parseHttpUrl(input.trim());
  let currentUrl = requestedUrl;

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const pinned = await resolvePublicAddress(currentUrl);
    let response: Awaited<ReturnType<typeof requestPage>>;
    try {
      response = await requestPage(currentUrl, pinned);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("We couldn't read this page automatically. You can still enter the opportunity manually.", "URL_FETCH_FAILED", 422);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.location;
      if (!location) throw new AppError("The website returned an invalid redirect.", "URL_FETCH_FAILED", 422);
      if (redirect === MAX_REDIRECTS) throw new AppError("The website redirected too many times.", "TOO_MANY_REDIRECTS", 422);
      currentUrl = parseHttpUrl(new URL(location, currentUrl).toString());
      continue;
    }

    if (response.status < 200 || response.status >= 300) {
      const message = response.status === 403
        ? "The website blocked automatic reading. You can still enter the opportunity manually."
        : response.status === 404
          ? "The opportunity page could not be found."
          : "The website could not be read automatically. You can still enter the opportunity manually.";
      throw new AppError(message, "URL_HTTP_ERROR", 422);
    }

    const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.some((allowed) => contentType.startsWith(allowed))) {
      throw new AppError("This URL did not return an HTML or text page.", "UNSUPPORTED_CONTENT_TYPE", 415);
    }

    return {
      requestedUrl: requestedUrl.toString(),
      finalUrl: currentUrl.toString(),
      html: response.body.toString("utf8"),
      contentType,
    };
  }

  throw new AppError("The website redirected too many times.", "TOO_MANY_REDIRECTS", 422);
}
