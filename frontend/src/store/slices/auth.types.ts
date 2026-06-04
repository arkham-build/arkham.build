import type { LoginRequest, SessionResponse } from "@arkham-build/shared";
import type { HttpClient } from "../services/http-client";

export type AuthState = {
  session: SessionResponse | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
};

export type AuthSlice = {
  auth: AuthState;
  handleUnauthorized(): Promise<void>;
  initSession(client: HttpClient): Promise<void>;
  login(client: HttpClient, payload: LoginRequest): Promise<void>;
  logout(client: HttpClient): Promise<void>;
  refreshSession(client: HttpClient): Promise<void>;
};
