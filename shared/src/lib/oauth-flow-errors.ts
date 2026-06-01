export type OAuthFlowErrorCode =
  | "arkhamdb_invalid_response"
  | "arkhamdb_no_decks"
  | "identity_belongs_to_another_account"
  | "invalid_state"
  | "oauth_failed"
  | "oauth_missing_code";

export const OAUTH_FLOW_ERROR_CODES = new Set([
  "arkhamdb_invalid_response",
  "arkhamdb_no_decks",
  "identity_belongs_to_another_account",
  "invalid_state",
  "oauth_failed",
  "oauth_missing_code",
]);
