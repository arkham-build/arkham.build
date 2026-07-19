import type {
  GrimoireEntry,
  GrimoireResponse,
  GrimoireSection,
} from "@arkham-build/shared";
import { getPackIcon } from "@/components/icons/pack-icon.helpers";
import { cycleOrPack, displayAttribute } from "@/utils/card-utils";
import { prepareNeedle, prepareSearchText } from "@/utils/fuzzy";
import { Metadata } from "@/store/slices/metadata.types";

const GRIMOIRE_CITATION_PREFIX = "grimoire-";

export type GrimoireMaps = {
  entriesBySectionId: Map<string, GrimoireEntry[]>;
  entrySearchTextById: Map<string, string>;
  sectionSearchTextById: Map<string, string>;
};

export type FilteredGrimoire = {
  entryIds: Set<string>;
  sectionIds: Set<string>;
};

export function getGrimoireCardTitle(code: string, metadata: Metadata) {
  const card = metadata.cards[code];
  const name = displayAttribute(card, "name") || code;
  const link = `[${name}](/card/${encodeURIComponent(code)})`;

  if (!card) return link;

  const pack = metadata.packs[card.pack_code];
  const cycle = pack ? metadata.cycles[pack.cycle_code] : undefined;

  if (!pack || !cycle) return link;

  const icon = getPackIcon(cycleOrPack(cycle, pack).code);

  if (!icon) return link;

  return `${link} <small>(<i data-icon="${icon}"></i> ${card.position})</small>`;
}

export function getLatestGrimoireVersion(
  grimoire: GrimoireResponse | undefined,
) {
  if (!grimoire) return undefined;

  let latest: string | undefined;
  const citedItems = [
    ...grimoire.entries,
    ...grimoire.errata,
    ...grimoire.faq,
    ...grimoire.sections,
  ];

  for (const item of citedItems) {
    if (!item.citation?.startsWith(GRIMOIRE_CITATION_PREFIX)) continue;

    const version = item.citation.slice(GRIMOIRE_CITATION_PREFIX.length);

    if (
      !latest ||
      version.localeCompare(latest, undefined, { numeric: true }) > 0
    ) {
      latest = version;
    }
  }

  return latest;
}

export function buildGrimoireMaps(
  entries: GrimoireEntry[],
  sections: GrimoireSection[],
): GrimoireMaps {
  return {
    entriesBySectionId: groupEntriesBySection(entries),
    entrySearchTextById: buildEntrySearchTextById(entries),
    sectionSearchTextById: buildSectionSearchTextById(sections),
  };
}

export function filterGrimoire(
  entries: GrimoireEntry[],
  sections: GrimoireSection[],
  grimoireMaps: GrimoireMaps,
  search: string,
) {
  const needle = prepareNeedle(search);

  if (!needle || search.length <= 2) {
    return {
      entryIds: new Set(entries.map((entry) => entry.id)),
      sectionIds: new Set(sections.map((section) => section.id)),
    };
  }

  const filteredGrimoire: FilteredGrimoire = {
    entryIds: new Set<string>(),
    sectionIds: new Set<string>(),
  };

  for (const entry of entries) {
    if (!needle.test(grimoireMaps.entrySearchTextById.get(entry.id) ?? "")) {
      continue;
    }

    filteredGrimoire.entryIds.add(entry.id);
    filteredGrimoire.sectionIds.add(entry.section);
  }

  for (const section of sections) {
    if (
      !needle.test(grimoireMaps.sectionSearchTextById.get(section.id) ?? "")
    ) {
      continue;
    }

    filteredGrimoire.sectionIds.add(section.id);

    for (const entry of grimoireMaps.entriesBySectionId.get(section.id) ?? []) {
      filteredGrimoire.entryIds.add(entry.id);
    }
  }

  return filteredGrimoire;
}

function groupEntriesBySection(entries: GrimoireEntry[]) {
  const entriesBySectionId = new Map<string, GrimoireEntry[]>();

  for (const entry of entries.toSorted((left, right) =>
    compareGrimoireIds(left.id, right.id),
  )) {
    const sectionEntries = entriesBySectionId.get(entry.section) ?? [];

    sectionEntries.push(entry);
    entriesBySectionId.set(entry.section, sectionEntries);
  }

  return entriesBySectionId;
}

function compareGrimoireIds(leftId: string, rightId: string) {
  const leftParts = leftId.split(".").map((part) => Number.parseInt(part, 10));
  const rightParts = rightId
    .split(".")
    .map((part) => Number.parseInt(part, 10));
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];

    if (Number.isNaN(leftPart) || Number.isNaN(rightPart)) {
      return leftId.localeCompare(rightId, undefined, { sensitivity: "base" });
    }

    if (leftPart !== rightPart) {
      return leftPart - rightPart;
    }
  }

  return leftId.localeCompare(rightId, undefined, { sensitivity: "base" });
}

function buildEntrySearchTextById(entries: GrimoireEntry[]) {
  return new Map(
    entries.map((entry) => [
      entry.id,
      buildSearchText(entry.title, entry.text),
    ]),
  );
}

function buildSectionSearchTextById(sections: GrimoireSection[]) {
  return new Map(
    sections.map((section) => [
      section.id,
      buildSearchText(section.title, section.text),
    ]),
  );
}

function buildSearchText(title: string, text: string | null | undefined) {
  return prepareSearchText([title, text].filter(Boolean).join(" "));
}
