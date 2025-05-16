import type { FanMadeProject } from "../lib/fan-made-content.schemas";

export type FanMadeDataState = {
  projects: Record<string, FanMadeProject>;
};

export type FanMadeDataSlice = {
  fanMadeData: FanMadeDataState;
  addFanMadeProject: (project: unknown) => Promise<string>;
  removeFanMadeProject: (id: string) => Promise<void>;
};
