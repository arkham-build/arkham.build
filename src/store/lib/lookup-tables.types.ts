type Mapping<V extends string | number> = Record<string, V>;

export type LookupTable<
  T extends string | number,
  V extends string | number = 1,
> = Record<T, Mapping<V>>;

export type LookupTables = {
  // TODO: add alternative_art investigators.
  relations: {
    // Base version for a parallel investigator.
    base: LookupTable<string, 1>;
    // `Hallowed Mirror` has bound `Soothing Melody`.
    bound: LookupTable<string, 1>;
    // `Soothing Melody` is bonded to `Hallowed Mirror`.
    bonded: LookupTable<string, 1>;
    // `Predator or Prey?` is the front for `The Masked Hunter`.
    fronts: LookupTable<string, 1>;
    // `Daisy's Tote Bag` is restrictory to `Daisy Walker`.
    restrictedTo: LookupTable<string, 1>;
    // `Daisy Walker`'s requires `Daisy's Tote Bag`.
    requiredCards: LookupTable<string, 1>;
    // Roland bannks has parallel card "Directive".
    parallelCards: LookupTable<string, 1>;
    // Parallel versions of an investigator.
    parallel: LookupTable<string, 1>;
    // Advanced requiredCards for an investigator.
    advanced: LookupTable<string, 1>;
    // Replacement requiredCards for an investigator.
    replacement: LookupTable<string, 1>;
    // Any card can have `n` different level version. (e.g. Ancient Stone)
    level: LookupTable<string, 1>;
    // Revised core "First Aid (3)"is a duplicate of Pallid Mask "First Aid (3)".
    duplicates: LookupTable<string, 1>;
    // Agatha Crane exists both as a mystic and a seeker card.
    otherVersions: LookupTable<string, 1>;
  };
  traitsByCardTypeSelection: LookupTable<string, 1>;
  packsByCycle: LookupTable<string, 1>;
  encounterCode: LookupTable<string>;
  typeCode: LookupTable<string>;
  subtypeCode: LookupTable<string>;
  actions: LookupTable<string>;
  factionCode: LookupTable<string>;
  properties: {
    fast: Mapping<1>;
    multislot: Mapping<1>;
    succeedBy: Mapping<1>;
  };
  skillBoosts: LookupTable<string>;
  traits: LookupTable<string>;
  uses: LookupTable<string>;
  level: LookupTable<number>;
};
