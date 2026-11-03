import {
  SettingsRequestSchema,
  SettingsResponseSchema,
} from "@arkham-build/shared";
import { createRevisionedAccountStateClient } from "./revisioned-account-state";

export const {
  fetch: fetchSettings,
  put: putSettings,
  isConflictError: isSettingsConflictError,
} = createRevisionedAccountStateClient({
  path: "/v2/account/settings",
  requestSchema: SettingsRequestSchema,
  responseSchema: SettingsResponseSchema,
  conflictErrorName: "SettingsConflictError",
});
