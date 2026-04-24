import type { JsonDataPack } from "@arkham-build/shared";
import type { WithItemTranslations } from "./json-data.types.ts";

type IgnoredAttributes = {
  cgdb_id?: number;
  replaced?: boolean;
};

export function resolvePacks(
  packs: (WithItemTranslations<JsonDataPack> & IgnoredAttributes)[],
) {
  const nextPacks = packs.map((pack) => {
    delete pack.cgdb_id;
    delete pack.replaced;
    pack.type = inferPackType(pack);
    pack.translations = reprintPackTranslations(pack, packs);
    return pack;
  });

  return nextPacks;
}

function inferPackType(pack: JsonDataPack) {
  const cycleCode = pack.cycle_code;

  if (cycleCode === "parallel") return "parallel_investigator";
  if (cycleCode === "investigator") return "investigator_starter_deck";
  if (cycleCode === "promotional") return "promo";
  if (cycleCode === "core") return "core_set";
  if (cycleCode === "return") return "return_to";
  if (cycleCode === "side_stories") return "standalone_scenario";

  const name = pack.name;

  if (name.includes("Campaign Expansion")) return "campaign_expansion";
  if (name.includes("Investigator Expansion")) {
    return "investigator_expansion";
  }

  return pack.position === 1 ? "deluxe_expansion" : "mythos_pack";
}

function reprintPackTranslations(
  pack: WithItemTranslations<JsonDataPack>,
  referencePacks: WithItemTranslations<JsonDataPack>[],
) {
  if (!pack.reprint_type) return pack.translations;

  const ref = referencePacks.find((p) => p.code === pack.code.slice(0, -1));
  if (!ref) return [];

  const translations = ref.translations?.map((translation) => {
    const postfixes =
      NEW_FORMAT_POSTFIXES[
        translation.locale as keyof typeof NEW_FORMAT_POSTFIXES
      ];

    const translatedPostfix =
      pack.reprint_type === "player"
        ? postfixes?.investigator
        : postfixes?.campaign;

    if (!translatedPostfix) return translation;

    return {
      ...translation,
      name: `${translation.name}${translatedPostfix}`,
    };
  });

  return translations;
}

const NEW_FORMAT_POSTFIXES = {
  de: {
    campaign: " (Kampagnen-Erweiterung)",
    investigator: " (Ermittler-Erweiterung)",
  },
  en: {
    campaign: " Campaign Expansion",
    investigator: " Investigator Expansion",
  },
  es: {
    campaign: " Expansión de Investigadores",
    investigator: " Expansión de Campaña",
  },
  fr: {
    campaign: " – Extension Campagne",
    investigator: " – Extension Investigateurs",
  },
  ko: {
    campaign: " 캠페인 확장",
    investigator: " 조사자 확장",
  },
  pl: {
    campaign: " - Rozszerzenie kampanijne",
    investigator: " - Rozszerzenie badaczy",
  },
  ru: {
    campaign: ". Кампания",
    investigator: ". Сыщики",
  },
  zh: {
    campaign: "劇本擴展",
    investigator: "調查員擴展",
  },
};
