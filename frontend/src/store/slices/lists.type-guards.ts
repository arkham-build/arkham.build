import type {
  AssetFilter,
  CardTypeFilter,
  CostFilter,
  FanMadeContentFilter,
  FilterKey,
  FilterObject,
  InvestigatorSkillsFilter,
  LevelFilter,
  OwnershipFilter,
  PropertiesFilter,
  SkillIconsFilter,
  SubtypeFilter,
} from "./lists.types";

export function isFanMadeContentFilterObject(
  filter?: FilterObject<FilterKey>,
): filter is FilterObject<"fan_made_content"> {
  return !!filter && filter.type === "fan_made_content";
}

export function isAssetFilter(value: unknown): value is AssetFilter {
  return (
    typeof value === "object" &&
    value != null &&
    "skillBoosts" in value &&
    "slots" in value &&
    "uses" in value
  );
}

export function isCardTypeFilter(value: unknown): value is CardTypeFilter {
  return value === "player" || value === "encounter" || value === "";
}

export function isCostFilter(value: unknown): value is CostFilter {
  return (
    typeof value === "object" &&
    value != null &&
    "range" in value &&
    "even" in value &&
    "odd" in value &&
    "x" in value
  );
}

export function isLevelFilter(value: unknown): value is LevelFilter {
  return typeof value === "object" && value != null && "range" in value;
}

export function isRangeFilter(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((v) => typeof v === "number")
  );
}

export function isMultiSelectFilter(value: unknown): value is string[] {
  return Array.isArray(value);
}

export function isOwnershipFilter(value: unknown): value is OwnershipFilter {
  return value === "all" || value === "owned" || value === "unowned";
}

export function isFanMadeContentFilter(
  value: unknown,
): value is FanMadeContentFilter {
  return value === "all" || value === "fan-made" || value === "official";
}

export function isPropertiesFilter(value: unknown): value is PropertiesFilter {
  return (
    typeof value === "object" &&
    value != null &&
    "fast" in value &&
    Object.values(value).every((v) => typeof v === "boolean")
  );
}

export function isSubtypeFilter(value: unknown): value is SubtypeFilter {
  return (
    typeof value === "object" &&
    value != null &&
    "none" in value &&
    "weakness" in value &&
    "basicweakness" in value
  );
}

export function isSkillIconsFilter(value: unknown): value is SkillIconsFilter {
  return (
    typeof value === "object" &&
    value != null &&
    Object.values(value).every((v) => typeof v === "number" || v == null)
  );
}

export function isInvestigatorSkillsFilter(
  value: unknown,
): value is InvestigatorSkillsFilter {
  return (
    typeof value === "object" &&
    value != null &&
    Object.values(value).every((v) => v == null || isRangeFilter)
  );
}
