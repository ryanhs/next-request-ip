/**
 * Parse x-forwarded-for headers.
 *
 * @param {string | null} value - The value to be parsed.
 * @return {string | null} First known IP address, if any.
 */
function getClientIpFromXForwardedFor(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  if (is.not.string(value)) {
    throw new TypeError(`Expected a string, got "${typeof value}"`);
  }

  // x-forwarded-for may return multiple IP addresses in the format:
  // "client IP, proxy 1 IP, proxy 2 IP"
  // Therefore, the right-most IP address is the IP address of the most recent proxy
  // and the left-most IP address is the IP address of the originating client.
  // source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
  // Azure Web App's also adds a port for some reason, so we'll only use the first part (the IP)
  const forwardedIps = value
    .split(",")
    .map((e) => normalizeIpCandidate(e.trim()));

  // Sometimes IP addresses in this header can be 'unknown' (http://stackoverflow.com/a/11285650).
  // Therefore taking the right-most IP address that is not unknown
  // A Squid configuration directive can also set the value to "unknown" (http://www.squid-cache.org/Doc/config/forwarded_for/)
  for (let i = 0; i < forwardedIps.length; i++) {
    if (is.ip(forwardedIps[i])) {
      return forwardedIps[i];
    }
  }

  // If no value in the split list is an ip, return null
  return null;
}

/**
 * Normalize candidate IP strings: strip surrounding quotes/brackets and trailing ports.
 */
function normalizeIpCandidate(input: string): string {
  let v = input.trim();

  // remove surrounding quotes
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }

  // [ipv6]:port
  const bracketMatch = v.match(/^\[([^\]]+)\](?::(\d+))?$/);
  if (bracketMatch) {
    return bracketMatch[1];
  }

  // ipv4:port
  const ipv4Port = v.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4Port) {
    return ipv4Port[1];
  }

  // ipv6 without brackets but with trailing :port — only strip if port looks like a real port (2-5 digits)
  const ipv6Port = v.match(/^([0-9a-fA-F:]+):(\d{2,5})$/);
  if (ipv6Port && ipv6Port[1].includes(":")) {
    return ipv6Port[1];
  }

  return v;
}

/**
 * Parse RFC 7239 Forwarded header and extract first `for` token that is a valid IP.
 */
function getClientIpFromForwarded(value: string | null): string | null {
  if (value === null) return null;
  if (is.not.string(value))
    throw new TypeError(`Expected a string, got "${typeof value}"`);

  // Forwarded may contain multiple comma-separated entries; each entry may have ; separated params
  const entries = value.split(",").map((e) => e.trim());
  for (const entry of entries) {
    const params = entry.split(";").map((p) => p.trim());
    for (const p of params) {
      const [k, raw] = p.split("=", 2).map((s) => s && s.trim());
      if (!k || !raw) continue;
      if (k.toLowerCase() === "for") {
        const candidate = normalizeIpCandidate(raw.replace(/^\s*for=/i, ""));
        // raw may include surrounding quotes — normalizeIpCandidate handles that
        if (is.ip(candidate)) return candidate;
      }
    }
  }

  return null;
}

/**
 * Determine client IP address.
 *
 * @param headers - The request headers.
 * @returns {string | null} ip - The IP address if known, or null if unknown.
 */
export function getClientIp(headers: Headers): string | null {
  // Standard headers used by Amazon EC2, Heroku, and others.
  const xClientIp = headers.get("x-client-ip");
  if (xClientIp && is.ip(xClientIp)) {
    return xClientIp;
  }

  // Cloudflare.
  // @see https://support.cloudflare.com/hc/en-us/articles/200170986-How-does-Cloudflare-handle-HTTP-Request-headers-
  // CF-Connecting-IP - applied to every request to the origin.
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp && is.ip(cfConnectingIp)) {
    return cfConnectingIp;
  }

  // DigitalOcean.
  // @see https://www.digitalocean.com/community/questions/app-platform-client-ip
  // DO-Connecting-IP - applied to app platform servers behind a proxy.
  const doConnectingIp = headers.get("do-connecting-ip");
  if (doConnectingIp && is.ip(doConnectingIp)) {
    return doConnectingIp;
  }

  // Fastly and Firebase hosting header (When forwarded to cloud function)
  const fastlyClientIp = headers.get("fastly-client-ip");
  if (fastlyClientIp && is.ip(fastlyClientIp)) {
    return fastlyClientIp;
  }

  // Akamai and Cloudflare: True-Client-IP.
  const trueClientIp = headers.get("true-client-ip");
  if (trueClientIp && is.ip(trueClientIp)) {
    return trueClientIp;
  }

  // Default nginx proxy/fcgi; alternative to x-forwarded-for, used by some proxies.
  const xRealIp = headers.get("x-real-ip");
  if (xRealIp && is.ip(xRealIp)) {
    return xRealIp;
  }

  // (Rackspace LB and Riverbed's Stingray)
  // http://www.rackspace.com/knowledge_center/article/controlling-access-to-linux-cloud-sites-based-on-the-client-ip-address
  // https://splash.riverbed.com/docs/DOC-1926
  const xClusterClientIp = headers.get("x-cluster-client-ip");
  if (xClusterClientIp && is.ip(xClusterClientIp)) {
    return xClusterClientIp;
  }

  // Envoy headers
  const xEnvoyExternal = headers.get("x-envoy-external-address");
  if (xEnvoyExternal && is.ip(xEnvoyExternal)) {
    return xEnvoyExternal;
  }

  const xEnvoyClient = headers.get("x-envoy-client-address");
  if (xEnvoyClient && is.ip(xEnvoyClient)) {
    return xEnvoyClient;
  }

  // Load-balancers (AWS ELB) or proxies.
  const xForwardedFor = getClientIpFromXForwardedFor(
    headers.get("x-forwarded-for"),
  );
  if (xForwardedFor && is.ip(xForwardedFor)) {
    return xForwardedFor;
  }

  // Some proxies preserve original client IP in this header
  const xOriginalForwardedFor = headers.get("x-original-forwarded-for");
  if (xOriginalForwardedFor) {
    const ip = getClientIpFromXForwardedFor(xOriginalForwardedFor);
    if (ip && is.ip(ip)) return ip;
  }

  // Envoy provides upstream service time; not an IP but useful to document
  const xEnvoyUpstreamTime = headers.get("x-envoy-upstream-service-time");
  if (xEnvoyUpstreamTime && xEnvoyUpstreamTime.trim() !== "") {
    // not returning it — only checked to exist; keep for future use or logging
  }

  const xForwarded = headers.get("x-forwarded");
  if (xForwarded && is.ip(xForwarded)) {
    return xForwarded;
  }

  const forwardedFor = headers.get("forwarded-for");
  if (forwardedFor && is.ip(forwardedFor)) {
    return forwardedFor;
  }

  const forwarded = headers.get("forwarded");
  const forwardedHeader = headers.get("forwarded");
  if (forwardedHeader && is.ip(forwardedHeader)) {
    return forwardedHeader;
  }

  const forwardedParsed = getClientIpFromForwarded(forwardedHeader);
  if (forwardedParsed && is.ip(forwardedParsed)) {
    return forwardedParsed;
  }

  // Google Cloud App Engine
  // https://cloud.google.com/appengine/docs/standard/go/reference/request-response-headers
  const xAppengineUserIp = headers.get("x-appengine-user-ip");
  if (xAppengineUserIp && is.ip(xAppengineUserIp)) {
    return xAppengineUserIp;
  }

  // Cloudflare fallback
  // https://blog.cloudflare.com/eliminating-the-last-reasons-to-not-enable-ipv6/#introducingpseudoipv4
  const cfPseudoIpv4 = headers.get("Cf-Pseudo-IPv4");
  if (cfPseudoIpv4 && is.ip(cfPseudoIpv4)) {
    return cfPseudoIpv4;
  }

  return null;
}

/**
 * Inspired by and credit to is_js [https://github.com/arasatasaygin/is.js]
 */

const regexes = {
  ipv4: /^(?:(?:\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])\.){3}(?:\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])$/,
  ipv6: /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i,
};

/**
 * Helper function which reverses the sense of predicate result
 * @param func
 * @returns
 */
function not(
  func: (...args: unknown[]) => boolean,
): (...args: unknown[]) => boolean {
  return function (...args: unknown[]) {
    return !func(...args);
  };
}

/**
 * Replaces is.existy from is_js.
 * @param value - The value to test
 * @returns {boolean} True if the value is defined, otherwise false
 */
function existy(value: unknown): boolean {
  return value != null;
}

/**
 * Replaces is.ip from is_js.
 * @param value - The value to test
 * @returns {boolean} True if the value is an IP address, otherwise false
 */
function ip(value: unknown): boolean {
  return (
    existy(value) &&
    typeof value === "string" &&
    (regexes.ipv4.test(value) || regexes.ipv6.test(value))
  );
}

/**
 * Replaces is.string from is_js.
 * @param value - The value to test
 * @returns True if the value is a string, otherwise false
 */
function string(value: unknown): boolean {
  return Object.prototype.toString.call(value) === "[object String]";
}

const is = {
  ip: ip,
  string: string,
  not: {
    string: not(string),
  },
};
