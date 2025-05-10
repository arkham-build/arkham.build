import type { CustomContentProject } from "../lib/custom-content.schemas";

export type CustomDataState = {
  projects: Record<string, CustomContentProject>;
};

export type CustomDataSlice = {
  customData: CustomDataState;
  addCustomProject: (project: unknown) => Promise<string>;
  removeCustomProject: (id: string) => Promise<void>;
};
