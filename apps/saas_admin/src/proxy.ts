import { NextResponse, type NextRequest } from "next/server";

/**
 * Platform routes treat a present Origin as a browser call and then require a
 * CSRF cookie. This console proxies `/api` on the server, so the upstream
 * request must not carry the browser's Origin or Referer.
 */
export function headersForApiProxy(headers: Headers): Headers {
  const forwarded = new Headers(headers);
  forwarded.delete("origin");
  forwarded.delete("referer");
  return forwarded;
}

export function proxy(request: NextRequest) {
  return NextResponse.next({
    request: { headers: headersForApiProxy(request.headers) },
  });
}

export const config = {
  matcher: ["/api/:path*"],
};
