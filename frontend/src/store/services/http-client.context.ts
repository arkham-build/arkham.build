import { createContext, useContext } from "react";
import { assert } from "@/utils/assert";
import type { HttpClient } from "./http-client";

export const HttpClientContext = createContext<HttpClient | null>(null);

export function useHttpClient(): HttpClient {
  const client = useContext(HttpClientContext);
  assert(client, "HTTP client not initialized.");
  return client;
}
