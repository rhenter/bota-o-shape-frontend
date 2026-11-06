import type { ReactNode } from "react";

import { PlatformShell } from "@/components/platform-shell";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>;
}
