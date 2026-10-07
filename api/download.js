import { Readable } from "node:stream";

const ALLOWED_HOSTS = [
  "saavncdn.com",
  "jiosaavn.com",
  "jiosaavndev.vercel.app",
  "aac.saavncdn.com",
  "scdn.co",
];

const isAllowedHost = (hostname) => {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");

  return ALLOWED_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  );
};

const getTargetUrl = (req) => {
  const value = req.query?.url;
  if (Array.isArray(value)) return value[0] || "";
  return typeof value === "string" ? value : "";
};

const parseAllowedUrl = (value) => {
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP(S) URLs are supported");
  }
  if (!isAllowedHost(parsed.hostname)) {
    throw new Error("Host is not allowed");
  }
  return parsed;
};

const fetchWithValidatedRedirects = async (initialUrl, method, headers) => {
  let target = parseAllowedUrl(initialUrl);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(target.toString(), {
      method,
      headers,
      redirect: "manual",
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error("Upstream redirect has no location");
    }

    target = parseAllowedUrl(new URL(location, target).toString());
  }

  throw new Error("Too many upstream redirects");
};

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawUrl = getTargetUrl(req);
  if (!rawUrl) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
    parseAllowedUrl(rawUrl);
  } catch (error) {
    const message = error?.message || "Invalid URL";
    return res.status(message === "Host is not allowed" ? 403 : 400).json({
      error: message,
    });
  }

  try {
    const headers = {};
    if (req.headers.range) headers.Range = req.headers.range;

    const upstream = await fetchWithValidatedRedirects(
      rawUrl,
      req.method,
      headers
    );

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).json({
        error: `Upstream request failed: ${upstream.status}`,
      });
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    const acceptRanges = upstream.headers.get("accept-ranges");

    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Range, Accept-Ranges, Content-Type"
    );

    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    res.setHeader("Accept-Ranges", acceptRanges || "bytes");

    if (req.method === "HEAD" || !upstream.body) return res.end();

    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    console.error("Download proxy error:", error);
    return res.status(502).json({
      error: error?.message || "Could not fetch the media file",
    });
  }
}
