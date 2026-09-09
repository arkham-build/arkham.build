import { useMutation } from "@tanstack/react-query";
import { useStore } from "@/store";
import { useHttpClient } from "@/store/services/http-client.context";

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
