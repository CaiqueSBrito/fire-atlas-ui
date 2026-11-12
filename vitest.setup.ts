import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// jsdom não implementa scrollIntoView (usado pelo Select).
Element.prototype.scrollIntoView = vi.fn();
