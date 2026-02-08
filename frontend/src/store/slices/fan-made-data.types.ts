import type { FanMadeProject } from "@arkham-build/shared";

export type FanMadeDataState = {
  projects: Record<string, FanMadeProject>;
};

export type FanMadeDataSlice = {
  fanMadeData: FanMadeDataState;
  addFanMadeProject: (project: unknown) => Promise<string>;
  removeFanMadeProject: (id: string) => Promise<void>;
};
