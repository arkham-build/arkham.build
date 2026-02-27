import type { LoginRequest, SessionResponse } from "@arkham-build/shared";

export type AuthState = {
  session: SessionResponse | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
};

export type AuthSlice = {
  auth: AuthState;
  initSession(): Promise<void>;
  login(payload: LoginRequest): Promise<void>;
  logout(): Promise<void>;
};
