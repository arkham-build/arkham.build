import {
  OAuthAuthorizationRequestTokenSchema,
  OAuthConsentDetailsResponseSchema,
} from "@arkham-build/shared";
import type { HttpClient } from "@/store/services/http-client";

export async function claimOAuthAuthorizationRequest(
  client: HttpClient,
  requestToken: string,
) {
  const token = OAuthAuthorizationRequestTokenSchema.parse(requestToken);
  const response = await client.request(
    `/v2/account/oauth/authorization-requests/${token}/claim`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  return OAuthConsentDetailsResponseSchema.parse(await response.json());
}
