import type { LoginRequest, MeResponse } from "@arkham-build/shared";

export type AuthState = {
  me: MeResponse | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
};

export type AuthSlice = {
  auth: AuthState;
  fetchMe(): Promise<void>;
  login(payload: LoginRequest): Promise<void>;
  logout(): Promise<void>;
  clearAuth(): void;
};
