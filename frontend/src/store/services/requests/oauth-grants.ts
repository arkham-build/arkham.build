import { OAuthGrantListResponseSchema } from "@arkham-build/shared";
import type { HttpClient } from "../http-client";

export async function fetchOAuthGrants(client: HttpClient) {
  const response = await client.request("/v2/account/oauth/grants", {
    credentials: "include",
  });

  return OAuthGrantListResponseSchema.parse(await response.json());
}

export async function revokeOAuthGrant(client: HttpClient, clientId: string) {
  await client.request(`/v2/account/oauth/grants/${clientId}`, {
    method: "DELETE",
    credentials: "include",
  });
}
