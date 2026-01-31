# next-request-ip

![CI](https://github.com/ryanhs/next-request-ip/actions/workflows/ci.yml/badge.svg) [![Coverage Status](https://coveralls.io/repos/github/ryanhs/next-request-ip/badge.svg?branch=main)](https://coveralls.io/github/ryanhs/next-request-ip?branch=main) [![npm version](https://img.shields.io/npm/v/next-request-ip.svg)](https://www.npmjs.com/package/next-request-ip)

A Next.js-friendly fork of [request-ip](https://github.com/pbojinov/request-ip), optimized for working with the Web API `Headers` to retrieve client IP addresses.

## Installation

```bash
npm install next-request-ip
# or
yarn add next-request-ip
```

## Usage

### App Router (Next.js 13+)

```typescript
import { getClientIp } from "next-request-ip";
import { headers } from "next/headers";

export default async function Page() {
  const headersList = await headers();
  const clientIp = getClientIp(headersList);

  return (
    <div>
      <p>Your IP: {clientIp}</p>
    </div>
  );
}
```

### API Routes

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { getClientIp } from "next-request-ip";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  return NextResponse.json({ ip });
}
```

### CommonJS (Node)

```js
// If your environment uses CommonJS you can require the package:
const { getClientIp } = require('next-request-ip');

// Example usage with a standard Fetch-like Request
// (Pass a Headers-compatible object to getClientIp)
const headers = new Headers({ 'x-client-ip': '192.0.2.1' });
console.log(getClientIp(headers)); // '192.0.2.1'
```
## API

### `getClientIp(headers: Headers): string | null`

Returns the client IP address from the request headers, or `null` if not found.

Checks the following headers in order of priority:
- `x-client-ip`
- `x-forwarded-for`
- `cf-connecting-ip`
- `do-connecting-ip`
- `fastly-client-ip`
- `true-client-ip`
- `x-real-ip`
- `x-cluster-client-ip`
- `x-envoy-external-address` (Envoy)
- `x-envoy-client-address` (Envoy)
- `x-original-forwarded-for`
- `x-envoy-upstream-service-time` (informational)
- `x-forwarded`
- `forwarded-for`
- `forwarded`
- `x-appengine-user-ip`
- `Cf-Pseudo-IPv4`

Supports both IPv4 and IPv6 addresses.

## Differences from request-ip

- Designed specifically for Next.js and the Web API `Headers` object
- No dependencies on Node.js-specific request objects
- Optimized for modern web standards

## Compatibility

- Minimum Node.js version: >= 20 (see `package.json` `engines`)


## License

MIT License - see [LICENSE](LICENSE) file for details.

## Credits

This library is a fork of [request-ip](https://github.com/pbojinov/request-ip) by Petar Bojinov.

Original copyright notice:

```
Copyright (c) 2014 Petar Bojinov
```