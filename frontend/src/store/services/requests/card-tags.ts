import {
  CardTagsSyncRequestSchema,
  CardTagsSyncResponseSchema,
} from "@arkham-build/shared";
import { createRevisionedAccountStateClient } from "./revisioned-account-state";

export const {
  fetch: fetchCardTags,
  put: putCardTags,
  isConflictError: isCardTagsConflictError,
} = createRevisionedAccountStateClient({
  path: "/v2/account/card-tags",
  requestSchema: CardTagsSyncRequestSchema,
  responseSchema: CardTagsSyncResponseSchema,
  conflictErrorName: "CardTagsConflictError",
});
