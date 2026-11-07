import { NextResponse, type NextRequest } from "next/server";

const hostOf = (value: string) => value.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");

/** Hosts that serve the SaaS portal itself; any other host is a candidate custom domain. */
export function portalHosts(env = process.env.PORTAL_HOSTS): Set<string> {
  return new Set(["localhost", "127.0.0.1", ...(env ?? "").split(",").map(hostOf).filter(Boolean)]);
}

/** Path to rewrite to for a custom-domain request, or null to pass through. */
export function customDomainRewrite(host: string, pathname: string, hosts = portalHosts()): string | null {
  const clean = hostOf(host);
  if (!clean || hosts.has(clean)) return null;
  // Only the landing root is branded; internal routes and assets (/_next, /api, files) are untouched.
  return pathname === "/" ? `/host-landing/${encodeURIComponent(clean)}` : null;
}

export function proxy(request: NextRequest) {
  const target = customDomainRewrite(request.headers.get("host") ?? "", request.nextUrl.pathname);
  const response = target ? NextResponse.rewrite(new URL(target, request.url)) : NextResponse.next();
  response.headers.set("Vary", "Accept-Language");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|screens/).*)"] };
