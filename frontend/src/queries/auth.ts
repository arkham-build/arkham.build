import { useQuery } from "@tanstack/react-query";
import { authKeys } from "@/queries/keys";
import { useHttpClient } from "@/store/services/http-client.context";
import { fetchSession } from "@/store/services/requests/auth";

export function useAuthSessionQuery() {
  const client = useHttpClient();

  return useQuery({
    queryKey: authKeys.session(),
    queryFn: () => fetchSession(client),
  });
}
