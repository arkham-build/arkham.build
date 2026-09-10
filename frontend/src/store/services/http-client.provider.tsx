import type { HttpClient } from "./http-client";
import { HttpClientContext } from "./http-client.context";

export function HttpClientProvider(props: {
  client: HttpClient;
  children: React.ReactNode;
}) {
  const { children, client } = props;

  return (
    <HttpClientContext.Provider value={client}>
      {children}
    </HttpClientContext.Provider>
  );
}
