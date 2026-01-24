export type AccessToken = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string | null;
  refresh_token: string;
};

export type ArkhamDBApiError = {
  code: number;
  message: string;
};

export type ArkhamDBDeck = {
  description_md?: string;
  exile_string?: string;
  id: number;
  ignoreDeckLimitSlots?: Record<string, number>;
  investigator_code: string;
  meta: string;
  name: string;
  problem:
    | "too_few_cards"
    | "too_many_cards"
    | "too_many_copies"
    | "invalid_cards"
    | "deck_options_limit"
    | "investigator";
  sideSlots?: Record<string, number>;
  slots: Record<string, number>;
  taboo?: number;
  tags?: string;
  user_id?: number;
  version: string;
  xp_adjustment?: number;
  xp_spent: number;
  previous_deck?: number;
  next_deck?: number;
};

export type OAuthErrorCode =
  | "invalid_token"
  | "invalid_grant"
  | "unknown_error"
  | string; // see https://github.com/FriendsOfSymfony/oauth2-php/blob/master/lib/OAuth2.php#L286

export type OAuthErrorResponse = {
  error: string;
  error_description: string;
};

export type OperationResponse = {
  msg: string | number;
  success: boolean;
};

export type WrappedResponse<T> = {
  data: T;
  headers: Record<string, string>;
  status: number;
};
