import type { CardTagsSyncResponse } from "@arkham-build/shared";
import { useMutation } from "@tanstack/react-query";
import { useStore } from "@/store";
import { useHttpClient } from "@/store/services/http-client.context";

export function useApplyRemoteCardTagsMutation() {
  const applyRemoteCardTags = useStore((state) => state.applyRemoteCardTags);

  return useMutation({
    mutationKey: ["card-tags", "apply-remote"],
    mutationFn: (response: CardTagsSyncResponse) =>
      applyRemoteCardTags(response),
  });
}

export function useLoadRemoteCardTagsMutation() {
  const client = useHttpClient();
  const loadRemoteCardTags = useStore((state) => state.loadRemoteCardTags);

  return useMutation({
    mutationKey: ["card-tags", "load-remote"],
    mutationFn: () => loadRemoteCardTags(client),
  });
}

export function useSaveCardTagsMutation() {
  const client = useHttpClient();
  const saveCardTags = useStore((state) => state.saveCardTags);

  return useMutation({
    mutationKey: ["card-tags", "save"],
    scope: { id: "card-tags-save" },
    mutationFn: (opts?: { expectedRevision?: string | null }) =>
      saveCardTags(client, opts),
  });
}
