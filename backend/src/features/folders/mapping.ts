import { FolderSyncResponseSchema } from "@arkham-build/shared";
import type { Selectable } from "kysely";
import type { AccountFolder } from "../../db/schema.types.ts";

export function mapAccountFolderStateToSyncResponse(
  accountFolderState:
    | Pick<Selectable<AccountFolder>, "state" | "revision">
    | undefined,
) {
  return FolderSyncResponseSchema.parse({
    revision: accountFolderState?.revision ?? null,
    state: accountFolderState?.state ?? null,
  });
}
