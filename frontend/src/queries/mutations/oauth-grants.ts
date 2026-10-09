import { useMutation, useQueryClient } from "@tanstack/react-query";
import { oauthGrantKeys } from "@/queries/keys";
import { useHttpClient } from "@/store/services/http-client.context";
import { revokeOAuthGrant } from "@/store/services/requests/oauth-grants";

export function useRevokeOAuthGrantMutation() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["oauth-grants", "revoke"],
    mutationFn: (clientId: string) => revokeOAuthGrant(client, clientId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: oauthGrantKeys.all }),
  });
}
