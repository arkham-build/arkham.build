import * as z from "zod/v4-mini";
import { ApiCardSchema } from "./card.schema";

const TabooSchema = z.pick(ApiCardSchema, {
  code: true,
  taboo_set_id: true,
  taboo_xp: true,
  text: true,
  back_text: true,
  customization_change: true,
  customization_options: true,
  customization_text: true,
  deck_options: true,
  deck_requirements: true,
  exceptional: true,
  real_back_text: true,
  real_customization_change: true,
  real_customization_text: true,
  real_taboo_text_change: true,
  real_text: true,
  taboo_text_change: true,
});

export type Taboo = z.infer<typeof TabooSchema>;
