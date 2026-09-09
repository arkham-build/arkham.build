import { useQuery } from "@tanstack/react-query";
import { oauthGrantKeys } from "@/queries/keys";
import { useHttpClient } from "@/store/services/http-client.context";
import { fetchOAuthGrants } from "@/store/services/requests/oauth-grants";

export function useOAuthGrantsQuery() {
  const client = useHttpClient();

  return useQuery({
    queryKey: oauthGrantKeys.list(),
    queryFn: () => fetchOAuthGrants(client),
  });
}
