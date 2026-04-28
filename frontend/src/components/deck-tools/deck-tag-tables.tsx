import type { Card } from "@arkham-build/shared";
import { ChevronDownIcon, ChevronUpIcon, Trash2Icon } from "lucide-react";
import { lazy, Suspense, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Content, Root, Trigger } from "@/components/ui/collapsible";
import { useStore } from "@/store";
import { makeSortFunction } from "@/store/lib/sorting";
import type { ResolvedDeck } from "@/store/lib/types";
import {
  selectTagCounts,
  selectTaggedCardsInDeck,
} from "@/store/selectors/lists";
import {
  selectLocaleSortingCollator,
  selectMetadata,
} from "@/store/selectors/shared";
import { ListCard } from "../list-card/list-card";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Plane } from "../ui/plane";
import { Tag } from "../ui/tag";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./deck-tools.module.css";

const LazyTagsChart = lazy(() =>
  import("./tags-chart").then((m) => ({ default: m.TagsChart })),
);

type Props = {
  deck: ResolvedDeck;
  readonly?: boolean;
};

export function DeckTagTables({ deck, readonly }: Props) {
  const { t } = useTranslation();
  const [showUntagged, setShowUntagged] = useState(false);
  const [countInstances, setCountInstances] = useState(true);

  const customTagsEnabled = useStore(
    (state) => state.settings.customTagsEnabled,
  );
  const globalCardTags = useStore(
    (state) => state.settings.globalCardTags ?? {},
  );
  const metadata = useStore((state) => state.metadata);
  const clearDeckCardTags = useStore((state) => state.clearDeckCardTags);

  const onClearDeckTags = useCallback(() => {
    if (!confirm(t("deck.tools.clear_deck_tags_confirm"))) return;
    clearDeckCardTags(deck.id);
  }, [clearDeckCardTags, deck.id, t]);

  if (!customTagsEnabled) return null;

  const taggedCards = selectTaggedCardsInDeck(deck.cardTags, globalCardTags);

  if (taggedCards.length === 0) return null;

  const slots = countInstances ? deck.slots : undefined;
  const tagCounts = selectTagCounts(deck.cardTags, globalCardTags, slots);
  const sortedTagCounts = Array.from(tagCounts.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  const taggedCodeSet = new Set(taggedCards.map(({ code }) => code));
  const untaggedCards = Object.keys(deck.slots)
    .filter((code) => (deck.slots[code] ?? 0) > 0 && !taggedCodeSet.has(code))
    .map((code) => metadata.cards[code])
    .filter((c): c is Card => c != null);

  const untaggedCount = countInstances
    ? untaggedCards.reduce((sum, c) => sum + (deck.slots[c.code] ?? 0), 0)
    : untaggedCards.length;

  const tagToCards = new Map<string, Card[]>();
  for (const { code, tags } of taggedCards) {
    const card = metadata.cards[code];
    if (!card) continue;
    for (const tag of tags) {
      if (!tagToCards.has(tag)) tagToCards.set(tag, []);
      tagToCards.get(tag)?.push(card);
    }
  }

  return (
    <Plane className={css["tags-plane"]}>
      <div className={css["tags-controls"]}>
        <Checkbox
          checked={countInstances}
          label={t("deck.tools.count_instances")}
          onCheckedChange={setCountInstances}
        />
        {untaggedCards.length > 0 && (
          <Checkbox
            checked={showUntagged}
            label={t("deck.tools.show_untagged")}
            onCheckedChange={setShowUntagged}
          />
        )}
      </div>
      <div className={css["tags-columns"]}>
        <div className={css["tags-col"]}>
          <Suspense fallback={null}>
            <LazyTagsChart
              countInstances={countInstances}
              deck={deck}
              showUntagged={showUntagged}
              untaggedCount={untaggedCount}
            />
          </Suspense>
        </div>

        <div className={css["tags-col"]}>
          <section className={css["section"]}>
            <div className={css["section-header"]}>
              <h3 className={css["section-title"]}>
                {t("deck.tools.tags_summary")}
              </h3>
              {!readonly && (
                <Button size="xs" type="button" onClick={onClearDeckTags}>
                  <Trash2Icon size={12} />
                  {t("deck.tools.clear_deck_tags")}
                </Button>
              )}
            </div>
            <table className={css["tag-table"]}>
              <thead>
                <tr>
                  <th className={css["trait-chart-column-trait"]}>
                    {t("deck.tools.tag")}
                  </th>
                  <th className={css["trait-chart-column-count"]}>
                    {t("deck.tools.count")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTagCounts.map(([tag, count]) => (
                  <TagSummaryRow
                    key={tag}
                    tag={tag}
                    count={count}
                    deck={deck}
                    cards={tagToCards.get(tag) ?? []}
                  />
                ))}
                {showUntagged && untaggedCards.length > 0 && (
                  <UntaggedSummaryRow
                    count={untaggedCount}
                    deck={deck}
                    cards={untaggedCards}
                  />
                )}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </Plane>
  );
}

function TagSummaryRow({
  tag,
  count,
  deck,
  cards: unsortedCards,
}: {
  tag: string;
  count: number;
  deck: ResolvedDeck;
  cards: Card[];
}) {
  const metadata = useStore(selectMetadata);
  const collator = useStore(selectLocaleSortingCollator);
  const [open, setOpen] = useState(false);

  const cards = [...unsortedCards].sort(
    makeSortFunction(["name", "level", "position"], metadata, collator),
  );

  return (
    <tr className={open ? css["open"] : css["closed"]}>
      <td className={css["trait-chart-column-trait"]}>
        <Root open={open} onOpenChange={setOpen}>
          <DefaultTooltip
            tooltip={<TagTooltip deck={deck} cards={cards} />}
            paused={open}
          >
            <Trigger asChild>
              <button className={css["trait-chart-title"]} type="button">
                {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
                <Tag size="xs">{tag}</Tag>
              </button>
            </Trigger>
          </DefaultTooltip>
          <Content className={css["trait-chart-item-details"]}>
            <ol className={css["trait-chart-item-details-list"]}>
              {cards.map((card) => (
                <ListCard
                  card={card}
                  key={card.code}
                  quantity={deck.slots[card.code]}
                  size="sm"
                  omitBorders
                />
              ))}
            </ol>
          </Content>
        </Root>
      </td>
      <td className={css["trait-chart-column-count"]}>{count}</td>
    </tr>
  );
}

function TagTooltip({ deck, cards }: { deck: ResolvedDeck; cards: Card[] }) {
  return (
    <ol className={css["trait-tooltip"]}>
      {cards.map((card) => (
        <ListCard
          card={card}
          cardLevelDisplay="icon-only"
          key={card.code}
          omitThumbnail
          quantity={deck.slots[card.code]}
          size="xs"
        />
      ))}
    </ol>
  );
}

function UntaggedSummaryRow({
  count,
  deck,
  cards: unsortedCards,
}: {
  count: number;
  deck: ResolvedDeck;
  cards: Card[];
}) {
  const { t } = useTranslation();
  const metadata = useStore(selectMetadata);
  const collator = useStore(selectLocaleSortingCollator);
  const [open, setOpen] = useState(false);

  const cards = [...unsortedCards].sort(
    makeSortFunction(["name", "level", "position"], metadata, collator),
  );

  return (
    <tr className={css["tag-row-untagged"]}>
      <td className={css["trait-chart-column-trait"]}>
        <Root open={open} onOpenChange={setOpen}>
          <Trigger asChild>
            <button className={css["trait-chart-title"]} type="button">
              {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
              <span className={css["tag-untagged-label"]}>
                {t("deck.tools.untagged")}
              </span>
            </button>
          </Trigger>
          <Content className={css["trait-chart-item-details"]}>
            <ol className={css["trait-chart-item-details-list"]}>
              {cards.map((card) => (
                <ListCard
                  card={card}
                  key={card.code}
                  quantity={deck.slots[card.code]}
                  size="sm"
                  omitBorders
                />
              ))}
            </ol>
          </Content>
        </Root>
      </td>
      <td className={css["trait-chart-column-count"]}>{count}</td>
    </tr>
  );
}
