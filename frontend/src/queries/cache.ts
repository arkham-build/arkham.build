import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cacheKeys } from "@/queries/keys";
import { useStore } from "@/store";
import { useHttpClient } from "@/store/services/http-client.context";
import {
  queryCards,
  queryDataVersion,
  queryMetadata,
} from "@/store/services/requests/cache";

export function useDataVersionQuery(locale: string, enabled = true) {
  const client = useHttpClient();

  return useQuery({
    queryKey: cacheKeys.dataVersion(locale),
    queryFn: () => queryDataVersion(client, locale),
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useRefreshMetadataMutation() {
  const client = useHttpClient();
  const queryClient = useQueryClient();
  const init = useStore((state) => state.init);
  const locale = useStore((state) => state.settings.locale);

  return useMutation({
    mutationKey: ["cache", "refresh-metadata", locale],
    mutationFn: async () => {
      await init(
        (nextLocale) => queryMetadata(client, nextLocale),
        (nextLocale) => queryDataVersion(client, nextLocale),
        (nextLocale) => queryCards(client, nextLocale),
        {
          refresh: true,
          locale,
        },
      );

      const dataVersion = useStore.getState().metadata.dataVersion;
      queryClient.setQueryData(cacheKeys.dataVersion(locale), dataVersion);
    },
  });
}
