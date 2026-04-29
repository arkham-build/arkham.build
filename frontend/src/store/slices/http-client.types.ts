import type { HttpClient } from "../services/http-client";

export type HttpClientSlice = {
  httpClient: HttpClient | null;
  setHttpClient(client: HttpClient): void;
  handleUnauthorized(): Promise<void>;
};
