import type { GrimoireEntry, GrimoireSection } from "@arkham-build/shared";

export function resolveGrimoireSections(sections: GrimoireSection[]) {
  return sections.map((section) => ({
    citation: section.citation ?? null,
    id: section.id,
    position: section.position,
    text: section.text ?? null,
    title: section.title,
    translations: [],
  }));
}

export function resolveGrimoireEntries(entries: GrimoireEntry[]) {
  return entries.map((entry) => ({
    citation: entry.citation,
    id: entry.id,
    section: entry.section,
    text: entry.text ?? null,
    title: entry.title,
    translations: [],
  }));
}

export function resolveGrimoireEntryReferences(entries: GrimoireEntry[]) {
  return entries.flatMap((entry) =>
    [...new Set(entry.references ?? [])].map((targetEntryId, index) => ({
      position: index + 1,
      source_id: entry.id,
      target_id: targetEntryId,
    })),
  );
}
