import type { FanMadeProject } from "@arkham-build/shared";
import { useQuery } from "@tanstack/react-query";
import { fanMadeKeys } from "@/queries/keys";
import { useHttpClient } from "@/store/services/http-client.context";
import {
  queryFanMadeProjectData,
  queryFanMadeProjects,
} from "@/store/services/requests/fan-made-projects";

export function useFanMadeProjectsQuery() {
  const client = useHttpClient();

  return useQuery({
    queryKey: fanMadeKeys.listings(),
    queryFn: () => queryFanMadeProjects(client),
  });
}

export function useFanMadeProjectDataQuery(bucketPath: string, enabled = true) {
  return useQuery<FanMadeProject>({
    queryKey: fanMadeKeys.project(bucketPath),
    queryFn: () => queryFanMadeProjectData(bucketPath),
    enabled,
  });
}

export function useQuickInstallQuery(
  idOrUrl: string | undefined,
  queryFn: () => Promise<unknown>,
  enabled: boolean,
) {
  return useQuery({
    queryKey: fanMadeKeys.quickInstall(idOrUrl ?? "unknown"),
    queryFn,
    enabled: enabled && idOrUrl != null,
  });
}
