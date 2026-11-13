import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  localStorage.removeItem("bota-o-shape:gym-session");
  localStorage.removeItem("bota-o-shape:gym-tenant");
});
