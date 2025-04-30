import type { Card } from "@/store/services/queries.types";
import type { LookupTables } from "@/store/slices/lookup-tables.types";
import type { Metadata } from "@/store/slices/metadata.types";
import { cardLevel, cycleOrPack, displayAttribute } from "@/utils/card-utils";
import { displayPackName } from "@/utils/formatting";

export type CardFormat =
  | "paragraph"
  | "paragraphColored"
  | "header"
  | "headerWithSet";

type Padding = "left" | "right" | "both" | false;

type TemplateStringPlaceholders = "class" | "name" | "code" | "set";

export type CardFormatDefinition = {
  templateString: string;
  placeholderOptions: {
    class: {
      padding: Padding;
    };
    name: {
      classColored: boolean;
      subname: {
        display: boolean | "disambiguate";
        small: boolean;
        parentheses: boolean;
        padding: Padding;
      };
      level: {
        display: boolean | "disambiguate";
        type: "dots" | "number-parentheses" | "number-parenteses-with-zero";
        padding: Padding;
      };
    };
    set: {
      small: boolean;
      parentheses: boolean;
      collectionNumber: boolean;
      padding: Padding;
    };
  };
};

const FORMATS: Record<CardFormat, CardFormatDefinition> = {
  paragraph: {
    templateString: "[{name}](/card/{code})",
    placeholderOptions: {
      class: {
        padding: "right",
      },
      name: {
        classColored: false,
        subname: {
          display: "disambiguate",
          small: true,
          parentheses: true,
          padding: "left",
        },
        level: {
          display: "disambiguate",
          type: "number-parentheses",
          padding: "left",
        },
      },
      set: {
        small: true,
        parentheses: true,
        collectionNumber: false,
        padding: "left",
      },
    },
  },
  paragraphColored: {
    templateString: "[{name}](/card/{code})",
    placeholderOptions: {
      class: {
        padding: "right",
      },
      name: {
        classColored: true,
        subname: {
          display: "disambiguate",
          small: true,
          parentheses: true,
          padding: "left",
        },
        level: {
          display: "disambiguate",
          type: "number-parentheses",
          padding: "left",
        },
      },
      set: {
        small: true,
        parentheses: true,
        collectionNumber: false,
        padding: "left",
      },
    },
  },
  header: {
    templateString: "{class}[**{name}**](/card/{code})",
    placeholderOptions: {
      class: {
        padding: "right",
      },
      name: {
        classColored: true,
        subname: {
          display: "disambiguate",
          small: true,
          parentheses: true,
          padding: "left",
        },
        level: {
          display: true,
          type: "dots",
          padding: "left",
        },
      },
      set: {
        small: true,
        parentheses: true,
        collectionNumber: false,
        padding: "left",
      },
    },
  },
  headerWithSet: {
    templateString: "{class}[**{name}**](/card/{code}){set}",
    placeholderOptions: {
      class: {
        padding: "right",
      },
      name: {
        classColored: true,
        subname: {
          display: "disambiguate",
          small: true,
          parentheses: true,
          padding: "left",
        },
        level: {
          display: true,
          type: "dots",
          padding: "left",
        },
      },
      set: {
        small: true,
        parentheses: true,
        collectionNumber: true,
        padding: "left",
      },
    },
  },
};

export function insertCardFormatValueToCardFormatDefinition(value: CardFormat) {
  return FORMATS[value];
}

function replacePlaceholder(
  str: string,
  placeholder: TemplateStringPlaceholders,
  replaceWith: string,
) {
  return str.replaceAll(`{${placeholder}}`, replaceWith);
}

function pad(str: string, padding: Padding): string {
  switch (padding) {
    case "left":
      return ` ${str}`;
    case "right":
      return `${str} `;
    case "both":
      return ` ${str} `;
    default:
      return str;
  }
}

function wrapHtmlTag(
  str: string,
  tag: string,
  attributes?: { [k: string]: string },
): string {
  if (!attributes) {
    return `<${tag}>${str}</${tag}>`;
  }

  const attributeString = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

  return `<${tag} ${attributeString}>${str}</${tag}>`;
}

function wrapParentheses(str: string): string {
  return `(${str})`;
}

function factionIcon(faction: string | undefined): string {
  switch (faction) {
    case "seeker":
    case "guardian":
    case "rogue":
    case "mystic":
    case "survivor":
      return `<span class="icon-${faction}"></span>`;
    default:
      return "";
  }
}

function getCardFactionIcons(card: Card): string {
  return [card.faction_code, card.faction2_code, card.faction3_code]
    .map(factionIcon)
    .filter(Boolean)
    .join("");
}

function getCardColor(card: Card): string {
  if (card.faction2_code || card.faction3_code) {
    return "fg-dual";
  }

  switch (card.faction_code) {
    case "guardian":
    case "seeker":
    case "rogue":
    case "mystic":
    case "survivor":
    case "neutral":
      return `fg-${card.faction_code}`;
    default:
      return "";
  }
}

function wrapClassColor(str: string, card: Card): string {
  return card.faction_code === "mythos"
    ? str
    : wrapHtmlTag(str, "span", { class: getCardColor(card) });
}

export function cardToMarkdown(
  card: Card,
  lookupTables: LookupTables,
  metadata: Metadata,
  format: CardFormatDefinition,
) {
  let str = format.templateString;

  str = replacePlaceholder(str, "code", card.code);
  str = replacePlaceholder(str, "class", renderClass(card, format));
  str = replacePlaceholder(str, "set", renderSet(card, format, metadata));
  str = replacePlaceholder(
    str,
    "name",
    renderName(card, format, metadata, lookupTables),
  );

  return str;
}

function renderClass(card: Card, format: CardFormatDefinition) {
  const padding = format.placeholderOptions.class.padding;
  const str = getCardFactionIcons(card);

  if (!str || !padding) {
    return str;
  }

  return pad(str, padding);
}

function renderSet(
  card: Card,
  format: CardFormatDefinition,
  metadata: Metadata,
) {
  const pack = metadata.packs[card.pack_code];
  const cycle = metadata.cycles[pack.cycle_code];
  const config = format.placeholderOptions.set;

  let str = displayPackName(cycleOrPack(cycle, pack));

  if (config.collectionNumber) {
    str += ` #${card.position}`;
  }

  if (config.parentheses) {
    str = wrapParentheses(str);
  }

  if (config.small) {
    str = wrapHtmlTag(str, "span", { class: "small" });
  }

  if (config.padding) {
    str = pad(str, config.padding);
  }

  return str;
}

function renderName(
  card: Card,
  format: CardFormatDefinition,
  metadata: Metadata,
  lookupTables: LookupTables,
) {
  const config = format.placeholderOptions.name;

  const name = displayAttribute(card, "name");
  const subname = renderSubname(card, format, metadata, lookupTables);
  const level = renderLevel(card, format, lookupTables);

  const title = `${name}${subname}${level}`;
  return config.classColored ? wrapClassColor(title, card) : title;
}

function renderSubname(
  card: Card,
  format: CardFormatDefinition,
  metadata: Metadata,
  lookupTables: LookupTables,
) {
  const subname = displayAttribute(card, "subname");
  if (!subname) return "";

  const config = format.placeholderOptions.name.subname;
  let showSubname = false;

  if (config.display === "disambiguate") {
    let needsDisambiguation = false;
    const seenLevels = new Set<number | undefined>();

    const versions = Object.keys(lookupTables.relations.level[card.code] ?? {});
    for (const code of versions) {
      const versionLevel = cardLevel(metadata.cards[code]);

      if (seenLevels.has(versionLevel)) {
        needsDisambiguation = true;
        break;
      }

      seenLevels.add(versionLevel);
    }

    showSubname = needsDisambiguation;
  } else {
    showSubname = config.display;
  }

  if (!showSubname) return "";

  let str = subname;

  if (config.parentheses) str = wrapParentheses(str);
  if (config.small) str = wrapHtmlTag(str, "span", { class: "small" });

  str = pad(str, config.padding);
  return str;
}

function renderLevel(
  card: Card,
  format: CardFormatDefinition,
  lookupTables: LookupTables,
) {
  const config = format.placeholderOptions.name.level;
  const level = cardLevel(card);

  if (level == null || !config.display) return "";

  if (config.display === "disambiguate") {
    const otherLevels = lookupTables.relations.level[card.code];
    if (!otherLevels) return "";
  }

  let str = "";

  if (config.type === "dots" && level > 0) {
    str = wrapHtmlTag("•".repeat(level), "span", {
      class: "card-xp",
    });
  } else if (config.type === "number-parentheses" && level > 0) {
    str = wrapParentheses(level.toString());
  } else if (config.type === "number-parenteses-with-zero") {
    str = wrapParentheses(level.toString());
  }

  return str ? pad(str, config.padding) : str;
}
