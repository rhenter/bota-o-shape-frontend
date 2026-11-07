/** Proxies the gym dashboard, which is served with basePath `/admin`, through the portal host. */
export function adminRewrites(origin: string | undefined): { source: string; destination: string }[] {
  const base = (origin ?? "").trim().replace(/\/$/, "");
  if (!base) return [];
  return [
    { source: "/admin", destination: `${base}/admin` },
    { source: "/admin/:path*", destination: `${base}/admin/:path*` },
  ];
}
