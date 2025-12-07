import type { SettingsState } from "@/store/slices/settings.types";

export type SettingProps = {
  settings: SettingsState;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
};
