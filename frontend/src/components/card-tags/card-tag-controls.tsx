import { CARD_TAG_FAVORITE_ID, type CardTag } from "@arkham-build/shared";
import { HeartIcon, PlusIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { useSaveCardTagsMutation } from "@/queries/mutations/card-tags";
import { useStore } from "@/store";
import { resolveCardTagCardCode } from "@/store/lib/card-tags";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
} from "@/store/selectors/shared";
import type { StoreState } from "@/store/slices";
import { cx } from "@/utils/cx";
import { Button } from "../ui/button";
import { Combobox } from "../ui/combobox/combobox";
import { ResultTag } from "../ui/combobox/combobox-results";
import css from "./card-tag-controls.module.css";

type Props = {
  cardCode: string;
  renderResult?: (tag: CardTag, onRemove?: () => void) => React.ReactNode;
  showFavorite?: boolean;
  showTags?: boolean;
};

type TagItem = {
  code: string;
  kind: "tag";
  tag: CardTag;
};

type TagOption =
  | TagItem
  | {
      code: string;
      kind: "create";
      name: string;
    };

const EMPTY_TAG_IDS: string[] = [];

export function CardTagControls({
  cardCode,
  renderResult,
  showFavorite = true,
  showTags = true,
}: Props) {
  const { i18n, t } = useTranslation();
  const saveCardTags = useSaveCardTagsMutation();

  const tagCard = useStore((state) => state.tagCard);
  const untagCard = useStore((state) => state.untagCard);
  const createCardTag = useStore((state) => state.createCardTag);
  const toggleFavorite = useStore((state) => state.toggleFavorite);

  const {
    authenticated,
    isFavorite,
    selectedItems,
    selectedTagIdSet,
    tagOptions,
  } = useStore((state) => selectCardTagControlsState(state, cardCode));

  const persist = useCallback(
    async (action: () => Promise<void>) => {
      await action();
      if (authenticated) {
        await saveCardTags.mutateAsync(undefined);
      }
    },
    [authenticated, saveCardTags],
  );

  const onToggleFavorite = useCallback(() => {
    void persist(() => toggleFavorite(cardCode)).catch(console.error);
  }, [cardCode, persist, toggleFavorite]);

  const onTagsChange = useCallback(
    (nextItems: TagOption[]) => {
      const createItem = nextItems.find((item) => item.kind === "create");

      if (createItem) {
        void persist(async () => {
          const tagId = await createCardTag(createItem.name);
          await tagCard(cardCode, tagId);
        }).catch(console.error);
        return;
      }

      const nextTagIds = new Set(
        nextItems
          .filter((item) => item.kind === "tag")
          .map((item) => item.tag.id),
      );

      void persist(async () => {
        for (const tagId of selectedTagIdSet) {
          if (!nextTagIds.has(tagId)) {
            await untagCard(cardCode, tagId);
          }
        }

        for (const tagId of nextTagIds) {
          if (!selectedTagIdSet.has(tagId)) {
            await tagCard(cardCode, tagId);
          }
        }
      }).catch(console.error);
    },
    [selectedTagIdSet, cardCode, createCardTag, persist, tagCard, untagCard],
  );

  const createItem = useCallback(
    (value: string) => {
      const name = value.trim();
      if (!name) return undefined;

      const exists = tagOptions.some(
        (item) =>
          item.kind === "tag" &&
          item.tag.name.trim().toLowerCase() === name.toLowerCase(),
      );

      return exists
        ? undefined
        : {
            code: `create:${name}`,
            kind: "create" as const,
            name,
          };
    },
    [tagOptions],
  );

  return (
    <div className={css["container"]}>
      {showFavorite && (
        <FavoriteButton isFavorite={isFavorite} onClick={onToggleFavorite} />
      )}
      {showTags && (
        <Combobox
          className={css["combobox"]}
          createItem={createItem}
          id={`card-tags-${cardCode}`}
          itemToString={tagOptionToString}
          items={tagOptions}
          label={t("card_tags.title")}
          locale={i18n.language}
          onValueChange={onTagsChange}
          placeholder={t("card_tags.placeholder")}
          renderItem={(item) =>
            item.kind === "tag" ? (
              item.tag.name
            ) : (
              <>
                <PlusIcon />
                {t("card_tags.create_named", { name: item.name })}
              </>
            )
          }
          renderResult={(item, onRemove) =>
            renderTagResult(item, onRemove, renderResult)
          }
          selectedItems={selectedItems}
        />
      )}
    </div>
  );
}

function FavoriteButton({
  isFavorite,
  onClick,
}: {
  isFavorite: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Button
      className={cx(css["favorite"], isFavorite && css["active"])}
      onClick={onClick}
      size="full"
    >
      <HeartIcon className={css["favorite-icon"]} />
      {t("card_tags.favorite")}
    </Button>
  );
}

const selectCardTagControlsState = createSelector(
  (state: StoreState) => state.cardTags.cardTags,
  (state: StoreState) => state.cardTags.tags,
  (state: StoreState) => state.metadata,
  (state: StoreState) => selectLookupTables(state).relations.fronts,
  selectLocaleSortingCollator,
  (state: StoreState) => state.auth.status === "authenticated",
  (_: StoreState, cardCode: string) => cardCode,
  (cardTags, tags, metadata, fronts, collator, authenticated, cardCode) => {
    const canonicalCode = resolveCardTagCardCode(metadata, fronts, cardCode);
    const assignedTagIds = cardTags[canonicalCode] ?? EMPTY_TAG_IDS;
    const selectedItems = assignedTagIds.reduce<TagItem[]>((acc, tagId) => {
      const tag = tags[tagId];
      if (tag) {
        acc.push({ code: tag.id, kind: "tag", tag });
      }
      return acc;
    }, []);

    return {
      authenticated,
      isFavorite: assignedTagIds.includes(CARD_TAG_FAVORITE_ID),
      selectedItems,
      selectedTagIdSet: new Set(selectedItems.map((item) => item.tag.id)),
      tagOptions: Object.values(tags)
        .sort((a, b) => collator.compare(a.name, b.name))
        .map<TagOption>((tag) => ({
          code: tag.id,
          kind: "tag",
          tag,
        })),
    };
  },
);

function tagOptionToString(item: TagOption) {
  return item.kind === "tag" ? item.tag.name : item.name;
}

function renderTagResult(
  item: TagOption,
  onRemove: (() => void) | undefined,
  renderResult: Props["renderResult"],
) {
  if (item.kind === "tag") {
    return renderResult ? (
      renderResult(item.tag, onRemove)
    ) : (
      <ResultTag
        data-testid={`combobox-result-${item.tag.id}`}
        onRemove={onRemove}
      >
        {item.tag.name}
      </ResultTag>
    );
  }

  return (
    <ResultTag data-testid={`combobox-result-${item.code}`} onRemove={onRemove}>
      {item.name}
    </ResultTag>
  );
}
