import type z from "zod";
import { ApiCardSchema } from "./card.schema";

const TabooSchema = ApiCardSchema.pick({
  back_text: true,
  code: true,
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
  taboo_set_id: true,
  taboo_text_change: true,
  taboo_xp: true,
  text: true,
});

export type Taboo = z.infer<typeof TabooSchema>;
