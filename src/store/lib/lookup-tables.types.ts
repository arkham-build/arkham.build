type Mapping<V extends string | number> = Record<string, V>;

export type LookupTable<
  T extends string | number,
  V extends string | number = 1,
> = Record<T, Mapping<V>>;

export type LookupTables = {
  actions: LookupTable<string>;
  encounterCode: LookupTable<string>;
  level: LookupTable<number>;
  packsByCycle: LookupTable<string>;
  properties: {
    fast: Mapping<1>;
    succeedBy: Mapping<1>;
  };
  relations: {
    // Base version for a parallel investigator.
    base: LookupTable<string>;
    // `Hallowed Mirror` has bound `Soothing Melody`.
    bound: LookupTable<string>;
    // `Soothing Melody` is bonded to `Hallowed Mirror`.
    bonded: LookupTable<string>;
    // `Predator or Prey?` is the front for `The Masked Hunter`.
    fronts: LookupTable<string>;
    // `Daisy's Tote Bag` is restrictory to `Daisy Walker`.
    restrictedTo: LookupTable<string>;
    // `Daisy Walker`'s requires `Daisy's Tote Bag`.
    requiredCards: LookupTable<string>;
    // Roland bannks has parallel card "Directive".
    parallelCards: LookupTable<string>;
    // Parallel versions of an investigator.
    parallel: LookupTable<string>;
    // Advanced requiredCards for an investigator.
    advanced: LookupTable<string>;
    // Replacement requiredCards for an investigator.
    replacement: LookupTable<string>;
    // Any card can have `n` different level version. (e.g. Ancient Stone)
    level: LookupTable<string>;
    // Revised core "First Aid (3)"is a duplicate of Pallid Mask "First Aid (3)".
    duplicates: LookupTable<string>;
    // Agatha Crane exists both as a mystic and a seeker card.
    otherVersions: LookupTable<string>;
  };
  reprintPacksByPack: LookupTable<string>;
  skillBoosts: LookupTable<string>;
  subtypeCode: LookupTable<string>;
  traits: LookupTable<string>;
  typeCode: LookupTable<string>;
  uses: LookupTable<string>;
};
