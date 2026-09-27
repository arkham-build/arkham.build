import { DeckSchema } from "@arkham-build/shared";
import { readFileSync } from "node:fs";
import { z } from "zod";

export const STARTER_DECKS = z
  .record(z.string(), DeckSchema)
  .parse(
    JSON.parse(
      readFileSync(
        new URL("../data/starter_decks.json", import.meta.url),
        "utf8",
      ),
    ),
  );

export const STARTER_DECKS_ARRAY = Object.values(STARTER_DECKS);

export const STARTER_DECKS_VERSION = STARTER_DECKS_ARRAY.length;
