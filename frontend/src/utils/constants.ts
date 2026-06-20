type Locale = {
  value: string;
  label: string;
  unicode?: boolean;
  displayValue?: string; // TECH DEBT: For mixed locales like zh-Hans/zh-Hant
  additionalCharacters?: string; // For languages with additional characters like ß or ñ
};

/**
 * If your language uses a different alphabet, please set the `unicode` flag here to `true`.
 * This is only necessary if the alphabet is not based on the latin alphabet at all.
 * Diacritics are fine and will be normalised with `String.prototype.normalize()` before searching.
 * Examples of where this is necessary: Korean, Russian.
 * Example of where this is not necessary: French, Polish.
 * Some languages add specific additional characters to the latin alphabet. These can be added as `additionalCharacters`.
 */
export const LOCALES: Record<string, Locale> = {
  de: { value: "de", label: "Deutsch (de)", additionalCharacters: "ß" },
  en: { value: "en", label: "English (en)" },
  es: { value: "es", label: "Español (es)", additionalCharacters: "ñ" },
  fr: { value: "fr", label: "Français (fr)" },
  ko: { value: "ko", label: "한국어/Korean (ko)", unicode: true },
  pl: { value: "pl", label: "Polski (pl)" },
  ru: { value: "ru", label: "Русский (ru)", unicode: true },
  "zh-cn": {
    value: "zh-cn",
    displayValue: "zh-Hans",
    label: "简体中文/Chinese (zh-Hans)",
    unicode: true,
  },
  zh: {
    value: "zh",
    displayValue: "zh-Hant",
    label: "繁體中文/Chinese (zh-Hant)",
    unicode: true,
  },
};

export const FLOATING_PORTAL_ID = "floating";

export const ISSUE_URL =
  "https://github.com/fspoettel/arkham.build/issues/new/choose";

export const REGEX_SKILL_BOOST = /\+\d+?\s\[(.+?)\]/g;

export const REGEX_USES = /Uses\s\(\d+?\s(\w+?)\)/;

export const REGEX_BONDED = /Bonded\s\((.*?)\)(\.|\s)/;

export const REGEX_SUCCEED_BY =
  /succe(ssful|ed(?:s?|ed?))(:? at a skill test)? by(?! 0)/;

const ACTION_TEXT: { [key: string]: string } = {
  fight: "Fight",
  engage: "Engage",
  investigate: "Investigate",
  draw: "Draw",
  move: "Move",
  evade: "Evade",
  parley: "Parley",
  resign: "Resign",
} as const;

export const ACTION_TEXT_ENTRIES = Object.entries(ACTION_TEXT);

export const SIDEWAYS_TYPE_CODES = ["act", "agenda", "investigator"];

export const CYCLES_WITH_STANDALONE_PACKS = [
  "core",
  "core_ch2",
  "return",
  "investigator",
  "investigator_decks_ch2",
  "promotional",
  "parallel",
  "side_stories",
];

export const ORIENTATION_CHANGED_CARDS = ["85037", "85038"];

export const CARD_SET_ORDER = [
  "base",
  "otherVersions",
  "requiredCards",
  "advanced",
  "replacement",
  "parallelCards",
  "bound",
  "bonded",
  "level",
  "parallel",
];

export const MQ_FLOATING_SIDEBAR = "(max-width: 52rem)";
export const MQ_FLOATING_FILTERS = "(max-width: 75rem)";
export const MQ_MOBILE = "(pointer: coarse)";
export const MQ_WIDE_PREVIEW = "(min-width: 85rem)";

export const NO_SLOT_STRING = "none";

export const RETURN_TO_CYCLES: Record<string, string> = {
  core: "rtnotz",
  dwl: "rtdwl",
  ptc: "rtptc",
  tfa: "rttfa",
  tcu: "rttcu",
};

export const TAG_REGEX_FALLBACKS: Record<string, RegExp> = {
  fa: /[Ff]irearm/,
  hd: /[Hh]eal(?!ed)(?!th)(?! in excess of)[^.!?]*?damage/,
  hh: /[Hh]eal(?!ed)(?!th)(?! in excess of)[^.!?]*?horror/,
  pa: /[Pp]arley/,
  se: /[Ss]eal(?! of the)/,
};

export const ARCHIVE_FOLDER_ID = "archive";

export const DEFAULT_LIST_SORT_ID = "list_default";
