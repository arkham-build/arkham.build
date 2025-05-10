import type { Cycle, Pack, TabooSet } from "@/store/services/queries.types";
import i18n from "@/utils/i18n";
import i18next from "i18next";
import { createSelector } from "reselect";

export function capitalize(s: string | number) {
  const str = s.toString();
  if (!str.length) return str;

  return `${str[0].toUpperCase()}${str.slice(1)}`;
}

// `toLocaleDateString()` is slow, memoize it.
export const formatDate = createSelector(
  (date: string | number) => date,
  (date) =>
    new Date(date).toLocaleDateString(navigator.language, {
      dateStyle: "medium",
    }),
);

// `toLocaleString()` is slow, memoize it.
export const formatDateTime = createSelector(
  (date: string | number) => date,
  (date) =>
    new Date(date).toLocaleString(navigator.language, {
      dateStyle: "short",
      timeStyle: "short",
    }),
);

export const formatTabooSet = createSelector(
  (tabooSet: TabooSet) => tabooSet,
  (tabooSet) => {
    const formattedDate = formatDate(tabooSet.date);
    return `${capitalize(tabooSet.name)} (${formattedDate})`;
  },
);

export function formatRelationTitle(id: string) {
  return i18next.t(`common.relations.${id}`);
}

export function formatUpgradeXP(
  xp: number | null,
  adjustment: number | null,
  spent: number | null,
) {
  const text = i18next.t("deck_view.history.upgrade_xp", {
    xp: xp ?? 0,
    spent: spent ?? 0,
    adjustment: adjustment
      ? `(${adjustment >= 0 ? "+" : "-"}${Math.abs(adjustment)})`
      : "",
  });

  return <span>{text}</span>;
}

export function formatGroupingType(type: string) {
  return i18n.t(`lists.categories.${type}`);
}

export function formatSlots(slots: string) {
  const slotStrs = slots.split(".");

  const formatted = slotStrs
    .map((slot) => i18n.t(`common.slot.${slot.trim().toLowerCase()}`))
    .join(". ");
  return `${formatted}${slotStrs.length > 1 ? "." : ""}`;
}

export function formatProviderName(name: string) {
  switch (name) {
    case "arkhamdb": {
      return "ArkhamDB";
    }

    default: {
      return capitalize(name);
    }
  }
}

export function displayPackName(pack: Pack | Cycle) {
  return pack.name ?? pack.real_name ?? "";
}

export function shortenPackName(pack: Pack) {
  return displayPackName(pack)
    .replace(i18n.t("common.packs_new_format.encounter"), "")
    .replace(i18n.t("common.packs_new_format.player"), "")
    .trim();
}
