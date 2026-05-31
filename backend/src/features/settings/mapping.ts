import { SettingsResponseSchema } from "@arkham-build/shared";
import type { Selectable } from "kysely";
import type { AccountSettings } from "../../db/schema.types.ts";

export function mapAccountSettingsToResponse(
  accountSettings:
    | Pick<Selectable<AccountSettings>, "collection" | "revision" | "settings">
    | undefined,
) {
  return SettingsResponseSchema.parse({
    collection: accountSettings?.collection ?? null,
    revision: accountSettings?.revision ?? null,
    settings: accountSettings?.settings ?? null,
  });
}
