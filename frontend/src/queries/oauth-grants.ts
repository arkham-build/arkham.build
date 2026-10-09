import { useQuery } from "@tanstack/react-query";
import { oauthGrantKeys } from "@/queries/keys";
import { useStore } from "@/store";
import { selectSession } from "@/store/selectors/auth";
import { useHttpClient } from "@/store/services/http-client.context";
import { fetchOAuthGrants } from "@/store/services/requests/oauth-grants";

export function useOAuthGrantsQuery() {
  const client = useHttpClient();
  const accountId = useStore(selectSession)?.account.id;

  return useQuery({
    queryKey: oauthGrantKeys.list(accountId),
    queryFn: () => fetchOAuthGrants(client),
    enabled: accountId != null,
  });
}
