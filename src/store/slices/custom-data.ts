import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import {
  parseCustomContentProject,
  validateCustomContentProject,
} from "../lib/custom-content";
import type { CustomDataSlice, CustomDataState } from "./custom-data.types";

function getInitialCustomData(): CustomDataState {
  return {
    projects: {},
  };
}

export const createCustomDataSlice: StateCreator<
  StoreState,
  [],
  [],
  CustomDataSlice
> = (set, get) => ({
  customData: getInitialCustomData(),

  async addCustomProject(payload) {
    const project = parseCustomContentProject(payload);
    validateCustomContentProject(project);

    const { code } = project.meta;

    set((state) => ({
      ...state,
      customData: {
        ...state.customData,
        projects: {
          ...state.customData.projects,
          [code]: project,
        },
      },
    }));

    await get().dehydrate("app");

    return project.meta.code;
  },

  async removeCustomProject(id) {
    set((state) => {
      const { [id]: _, ...projects } = state.customData.projects;

      return {
        ...state,
        customData: {
          ...state.customData,
          projects,
        },
      };
    });

    await get().dehydrate("app");
  },
});
