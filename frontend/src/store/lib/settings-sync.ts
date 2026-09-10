import {
  RemoteSettingsSchema,
  type Settings,
  type SettingsRequest,
  type SettingsResponse,
  SettingsSchema,
} from "@arkham-build/shared";

export function toRemoteSettings(
  settings: Settings,
): SettingsRequest["settings"] {
  return RemoteSettingsSchema.parse(settings);
}

export function fromRemoteSettings(
  remoteSettings: SettingsResponse["settings"],
  localSettings: Settings,
): Settings {
  if (remoteSettings == null) return localSettings;
  return SettingsSchema.parse({
    ...localSettings,
    ...RemoteSettingsSchema.parse(remoteSettings),
  });
}
