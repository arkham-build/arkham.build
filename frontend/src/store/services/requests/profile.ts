import {
  type UpdateProfileRequest,
  UpdateProfileRequestSchema,
} from "@arkham-build/shared";
import type { HttpClient } from "../http-client";

export async function patchProfile(
  client: HttpClient,
  payload: UpdateProfileRequest,
): Promise<void> {
  await client.request("/v2/account/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(UpdateProfileRequestSchema.parse(payload)),
    credentials: "include",
  });
}
