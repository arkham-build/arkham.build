import type { Database } from "../db.ts";

export function getFaqForCard(db: Database, cardCode: string) {
  return db
    .selectFrom("faq")
    .innerJoin("faq_card", "faq.id", "faq_card.faq_id")
    .select([
      "faq.citation",
      "faq.id",
      "faq.position",
      "faq.question",
      "faq.ruling",
      "faq.type",
    ])
    .where("faq_card.card_id", "=", cardCode)
    .orderBy("faq.position")
    .orderBy("faq_card.position")
    .execute();
}

export function getErrataForCard(db: Database, cardCode: string) {
  return db
    .selectFrom("errata")
    .innerJoin("errata_card", "errata.id", "errata_card.errata_id")
    .select([
      "errata.citation",
      "errata.id",
      "errata.position",
      "errata.ruling",
      "errata.section",
      "errata.type",
    ])
    .where("errata_card.card_id", "=", cardCode)
    .orderBy("errata.position")
    .orderBy("errata_card.position")
    .execute();
}

export async function getAllGrimoireEntries(db: Database) {
  const [entries, references] = await Promise.all([
    db.selectFrom("grimoire_entry").selectAll().orderBy("id").execute(),
    db
      .selectFrom("grimoire_entry_reference")
      .selectAll()
      .orderBy("source_id")
      .orderBy("position")
      .execute(),
  ]);

  const referencesByEntryId = groupValuesById(
    references,
    "source_id",
    "target_id",
  );

  return entries.map((entry) => ({
    ...entry,
    ...withOptionalArray("references", referencesByEntryId.get(entry.id)),
  }));
}

export function getAllGrimoireSections(db: Database) {
  return db
    .selectFrom("grimoire_section")
    .selectAll()
    .orderBy("position")
    .execute();
}

export async function getAllFaq(db: Database) {
  const [faq, faqCards, faqCycles, faqScenarios] = await Promise.all([
    db.selectFrom("faq").selectAll().orderBy("position").execute(),
    db
      .selectFrom("faq_card")
      .selectAll()
      .orderBy("faq_id")
      .orderBy("position")
      .execute(),
    db
      .selectFrom("faq_cycle")
      .selectAll()
      .orderBy("faq_id")
      .orderBy("position")
      .execute(),
    db
      .selectFrom("faq_scenario")
      .selectAll()
      .orderBy("faq_id")
      .orderBy("position")
      .execute(),
  ]);

  const cardCodesByFaqId = groupValuesById(faqCards, "faq_id", "card_id");
  const cyclesByFaqId = groupValuesById(faqCycles, "faq_id", "cycle_code");
  const scenarioCodesByFaqId = groupValuesById(
    faqScenarios,
    "faq_id",
    "scenario_code",
  );

  return faq.map((entry) => ({
    ...entry,
    ...withOptionalArray("card_codes", cardCodesByFaqId.get(entry.id)),
    ...withOptionalArray("cycles", cyclesByFaqId.get(entry.id)),
    ...withOptionalArray("scenario_codes", scenarioCodesByFaqId.get(entry.id)),
  }));
}

export async function getAllErrata(db: Database) {
  const [errata, errataCards, errataCycles, errataScenarios] =
    await Promise.all([
      db.selectFrom("errata").selectAll().orderBy("position").execute(),
      db
        .selectFrom("errata_card")
        .selectAll()
        .orderBy("errata_id")
        .orderBy("position")
        .execute(),
      db
        .selectFrom("errata_cycle")
        .selectAll()
        .orderBy("errata_id")
        .orderBy("position")
        .execute(),
      db
        .selectFrom("errata_scenario")
        .selectAll()
        .orderBy("errata_id")
        .orderBy("position")
        .execute(),
    ]);

  const cardCodesByErrataId = groupValuesById(
    errataCards,
    "errata_id",
    "card_id",
  );
  const cyclesByErrataId = groupValuesById(
    errataCycles,
    "errata_id",
    "cycle_code",
  );
  const scenarioCodesByErrataId = groupValuesById(
    errataScenarios,
    "errata_id",
    "scenario_code",
  );

  return errata.map((entry) => ({
    ...entry,
    ...withOptionalArray("card_codes", cardCodesByErrataId.get(entry.id)),
    ...withOptionalArray("cycles", cyclesByErrataId.get(entry.id)),
    ...withOptionalArray(
      "scenario_codes",
      scenarioCodesByErrataId.get(entry.id),
    ),
  }));
}

function groupValuesById<
  T extends { [K in IdKey | ValKey]: number | string },
  IdKey extends keyof T,
  ValKey extends keyof T,
>(rows: T[], idKey: IdKey, valKey: ValKey): Map<T[IdKey], T[ValKey][]> {
  const grouped = new Map<T[IdKey], T[ValKey][]>();

  for (const row of rows) {
    const id = row[idKey];
    const value = row[valKey];
    const values = grouped.get(id) ?? [];

    values.push(value);
    grouped.set(id, values);
  }

  return grouped;
}

function withOptionalArray<Key extends string, Val>(
  key: Key,
  values: Val[] | undefined,
): Partial<Record<Key, Val[]>> {
  if (!values?.length) return {};
  return { [key]: values } as Partial<Record<Key, Val[]>>;
}
