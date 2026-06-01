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

export type OperationResponse = {
  msg: string | number;
  success: boolean;
};
