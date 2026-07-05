import {
  CARD_TAG_FAVORITE_ID,
  CARD_TAG_NAME_MAX_LENGTH,
  type CardTag,
} from "@arkham-build/shared";
import { HeartIcon, PlusIcon, Settings2Icon } from "lucide-react";
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
import { isEmpty } from "@/utils/is-empty";
import { Button } from "../ui/button";
import { Combobox } from "../ui/combobox/combobox";
import { ResultTag } from "../ui/combobox/combobox-results";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Field, FieldLabel } from "../ui/field";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "../ui/modal";
import { useToast } from "../ui/toast.hooks";
import css from "./card-tag-controls.module.css";

type Props = {
  cardCode: string;
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
  showFavorite = true,
  showTags = true,
}: Props) {
  const { i18n, t } = useTranslation();
  const saveCardTags = useSaveCardTagsMutation();
  const toast = useToast();

  const tagCard = useStore((state) => state.tagCard);
  const untagCard = useStore((state) => state.untagCard);
  const createCardTag = useStore((state) => state.createCardTag);
  const deleteCardTag = useStore((state) => state.deleteCardTag);
  const renameCardTag = useStore((state) => state.renameCardTag);
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

  const onError = useCallback(
    (err: unknown) => {
      console.error(err);
      toast.show({
        children: t("card_tags.manage.error", {
          error:
            err instanceof Error
              ? err.message
              : t("card_tags.manage.unknown_error"),
        }),
        variant: "error",
      });
    },
    [t, toast],
  );

  const onToggleFavorite = useCallback(() => {
    void persist(() => toggleFavorite(cardCode)).catch(onError);
  }, [cardCode, onError, persist, toggleFavorite]);

  const onRenameTag = useCallback(
    (id: string, name: string) => persist(() => renameCardTag(id, name)),
    [persist, renameCardTag],
  );

  const onDeleteTag = useCallback(
    (id: string) => persist(() => deleteCardTag(id)),
    [deleteCardTag, persist],
  );

  const onTagsChange = useCallback(
    (nextItems: TagOption[]) => {
      const createItem = nextItems.find((item) => item.kind === "create");

      if (createItem) {
        void persist(async () => {
          const tagId = await createCardTag(createItem.name);
          await tagCard(cardCode, tagId);
        }).catch(onError);
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
      }).catch(onError);
    },
    [
      selectedTagIdSet,
      cardCode,
      createCardTag,
      onError,
      persist,
      tagCard,
      untagCard,
    ],
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
        <div className={css["tags"]}>
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
            renderResult={renderTagResult}
            selectedItems={selectedItems}
          />
          {!isEmpty(tagOptions) && (
            <CardTagManager
              onDelete={onDeleteTag}
              onError={onError}
              onRename={onRenameTag}
              tags={tagOptions.map((item) => item.tag)}
            />
          )}
        </div>
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

function CardTagManager({
  onDelete,
  onError,
  onRename,
  tags,
}: {
  onDelete: (id: string) => Promise<void>;
  onError: (err: unknown) => void;
  onRename: (id: string, name: string) => Promise<void>;
  tags: CardTag[];
}) {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          aria-label={t("card_tags.manage.action")}
          className={css["manager-trigger"]}
          iconOnly
          size="xs"
          tooltip={t("card_tags.manage.action")}
          type="button"
          variant="bare"
        >
          <Settings2Icon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Modal>
          <ModalInner size="32rem">
            <ModalActions />
            <DefaultModalContent title={t("card_tags.manage.title")}>
              <div className={css["manager-list"]}>
                {tags.map((tag) => (
                  <form
                    className={css["manager-row"]}
                    key={`${tag.id}:${tag.name}`}
                    onSubmit={(evt) => {
                      evt.preventDefault();
                      const name = new FormData(evt.currentTarget).get("name");
                      if (typeof name !== "string") return;
                      void onRename(tag.id, name).catch(onError);
                    }}
                  >
                    <Field className={css["manager-field"]} full>
                      <FieldLabel
                        className="sr-only"
                        htmlFor={`card-tag-${tag.id}`}
                      >
                        {t("card_tags.manage.name")}
                      </FieldLabel>
                      <input
                        defaultValue={tag.name}
                        id={`card-tag-${tag.id}`}
                        maxLength={CARD_TAG_NAME_MAX_LENGTH}
                        name="name"
                        required
                      />
                    </Field>
                    <Button type="submit" variant="secondary">
                      {t("card_tags.manage.save")}
                    </Button>
                    <Button
                      onClick={() => {
                        void onDelete(tag.id).catch(onError);
                      }}
                      type="button"
                      variant="danger"
                    >
                      {t("card_tags.manage.delete")}
                    </Button>
                  </form>
                ))}
              </div>
            </DefaultModalContent>
          </ModalInner>
        </Modal>
        <ModalBackdrop />
      </DialogContent>
    </Dialog>
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
        .map<TagItem>((tag) => ({
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

function renderTagResult(item: TagOption, onRemove: (() => void) | undefined) {
  if (item.kind === "tag") {
    return (
      <ResultTag
        className={css["tag-result"]}
        data-testid={`combobox-result-${item.tag.id}`}
        onRemove={onRemove}
        size="sm"
      >
        {item.tag.name}
      </ResultTag>
    );
  }

  return (
    <ResultTag
      className={css["tag-result"]}
      data-testid={`combobox-result-${item.code}`}
      onRemove={onRemove}
      size="sm"
    >
      {item.name}
    </ResultTag>
  );
}
