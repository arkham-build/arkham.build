import { vi } from "vitest";

globalThis.console.time = vi.fn();
globalThis.console.timeEnd = vi.fn();
