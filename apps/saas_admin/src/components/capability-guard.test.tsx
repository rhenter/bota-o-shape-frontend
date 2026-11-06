import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CapabilityGuard, hasCapability } from "./capability-guard";
import type { PlatformMembership } from "@/lib/platform-api";

const staff: PlatformMembership = {
  id: "membership-id",
  email: "staff@example.com",
  name: "Staff",
  role: "staff",
  capabilities: ["accounts.read"],
  is_active: true,
  mfa_enabled: true,
};

describe("capability guards", () => {
  it("allows a staff member with the required capability", () => {
    render(
      <CapabilityGuard membership={staff} capability="accounts.read">
        <p>Protected accounts</p>
      </CapabilityGuard>,
    );
    expect(screen.getByText("Protected accounts")).toBeInTheDocument();
  });

  it("blocks a staff member without the required capability", () => {
    render(
      <CapabilityGuard membership={staff} capability="billing.manage">
        <p>Protected billing</p>
      </CapabilityGuard>,
    );
    expect(screen.queryByText("Protected billing")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Você não tem acesso");
  });

  it("allows administrators across platform capabilities", () => {
    expect(hasCapability({ ...staff, role: "administrator", capabilities: [] }, "settings.manage")).toBe(true);
  });
});
