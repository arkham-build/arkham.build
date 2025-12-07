import { vi } from "vitest";

global.console.time = vi.fn();
global.console.timeEnd = vi.fn();
