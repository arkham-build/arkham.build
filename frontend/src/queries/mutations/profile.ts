import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/queries/keys";
import { useStore } from "@/store";
import { useHttpClient } from "@/store/services/http-client.context";
import { patchProfile } from "@/store/services/requests/profile";

export function usePatchProfileMutation() {
  const client = useHttpClient();
  const queryClient = useQueryClient();
  const initSession = useStore((state) => state.initSession);

  return useMutation({
    mutationKey: ["profile", "patch"],
    mutationFn: (payload: Parameters<typeof patchProfile>[1]) =>
      patchProfile(client, payload),
    onSuccess: async () => {
      await initSession(client);
      await queryClient.invalidateQueries({
        queryKey: authKeys.session(),
      });
    },
  });
}
