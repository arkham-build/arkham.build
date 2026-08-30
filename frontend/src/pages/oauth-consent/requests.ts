import {
  type OAuthAuthorizationRequestToken,
  OAuthConsentDetailsResponseSchema,
} from "@arkham-build/shared";
import type { HttpClient } from "@/store/services/http-client";

export async function claimOAuthAuthorizationRequest(
  client: HttpClient,
  requestToken: OAuthAuthorizationRequestToken,
) {
  const response = await client.request(
    `/v2/account/oauth/authorization-requests/${requestToken}/claim`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  return OAuthConsentDetailsResponseSchema.parse(await response.json());
}
