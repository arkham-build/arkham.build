import type { Settings, SettingsResponse } from "@arkham-build/shared";
import { useMutation } from "@tanstack/react-query";
import { useStore } from "@/store";
import { useHttpClient } from "@/store/services/http-client.context";

export function useApplySettingsMutation() {
  const client = useHttpClient();
  const applySettings = useStore((state) => state.applySettings);

  return useMutation({
    mutationKey: ["settings", "apply"],
    mutationFn: (payload: {
      settings: Settings;
      opts?: { keepListState?: boolean };
    }) => applySettings(client, payload.settings, payload.opts),
  });
}

export function useApplyRemoteSettingsMutation() {
  const client = useHttpClient();
  const applyRemoteSettings = useStore((state) => state.applyRemoteSettings);

  return useMutation({
    mutationKey: ["settings", "apply-remote"],
    mutationFn: (response: SettingsResponse) =>
      applyRemoteSettings(client, response),
  });
}

export function useLoadRemoteSettingsMutation() {
  const client = useHttpClient();
  const loadRemoteSettings = useStore((state) => state.loadRemoteSettings);

  return useMutation({
    mutationKey: ["settings", "load-remote"],
    mutationFn: () => loadRemoteSettings(client),
  });
}

export function useSaveSettingsMutation() {
  const client = useHttpClient();
  const saveSettings = useStore((state) => state.saveSettings);

  return useMutation({
    mutationKey: ["settings", "save"],
    mutationFn: (payload: {
      settings: Settings;
      opts?: { expectedRevision?: string | null; keepListState?: boolean };
    }) => saveSettings(client, payload.settings, payload.opts),
  });
}
