import type { Settings } from "@arkham-build/shared";

export type SettingProps = {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
};
