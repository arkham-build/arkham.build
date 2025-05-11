import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import {
  parseFanMadeProject,
  validateFanMadeProject,
} from "../lib/fan-made-content";
import type { FanMadeDataSlice, FanMadeDataState } from "./fan-made-data.types";

function getInitialFanMadeData(): FanMadeDataState {
  return {
    projects: {},
  };
}

export const createFanMadeDataSlice: StateCreator<
  StoreState,
  [],
  [],
  FanMadeDataSlice
> = (set, get) => ({
  fanMadeData: getInitialFanMadeData(),

  async addFanMadeProject(payload) {
    const project = parseFanMadeProject(payload);
    validateFanMadeProject(project);

    const { code } = project.meta;

    set((state) => ({
      ...state,
      fanMadeData: {
        ...state.fanMadeData,
        projects: {
          ...state.fanMadeData.projects,
          [code]: project,
        },
      },
    }));

    await get().dehydrate("app");

    return project.meta.code;
  },

  async removeFanMadeProject(id) {
    set((state) => {
      const { [id]: _, ...projects } = state.fanMadeData.projects;

      return {
        ...state,
        fanMadeData: {
          ...state.fanMadeData,
          projects,
        },
      };
    });

    await get().dehydrate("app");
  },
});
