import { CARD_TAG_NAME_MAX_LENGTH, type CardTag } from "@arkham-build/shared";
import { HeartIcon, PlusIcon, Settings2Icon } from "lucide-react";
import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import css from "./card-tag-controls.module.css";
import { type TagItem, useCardTagControls } from "./use-card-tag-controls";

type Props = {
  cardCode: string;
  showFavorite?: boolean;
  showTags?: boolean;
};

export function CardTagControls({
  cardCode,
  showFavorite = true,
  showTags = true,
}: Props) {
  const { i18n, t } = useTranslation();
  const {
    isFavorite,
    onCreateTag,
    onDeleteTag,
    onError,
    onRenameTag,
    onTagsChange,
    onToggleFavorite,
    selectedItems,
    tagOptions,
  } = useCardTagControls(cardCode);

  const creatable = useMemo(
    () => ({
      label: (name: string) => (
        <>
          <PlusIcon />
          {t("card_tags.create_named", { name })}
        </>
      ),
      onCreate: onCreateTag,
    }),
    [onCreateTag, t],
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
            creatable={creatable}
            id={`card-tags-${cardCode}`}
            itemToString={tagItemToString}
            items={tagOptions}
            label={t("card_tags.title")}
            locale={i18n.language}
            onValueChange={onTagsChange}
            placeholder={t("card_tags.placeholder")}
            renderItem={(item) => item.tag}
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
      aria-pressed={isFavorite}
      className={cx(css["favorite"], isFavorite && css["active"])}
      onClick={onClick}
      full
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
  onDelete: (name: string) => Promise<void>;
  onError: (err: unknown) => void;
  onRename: (name: string, nextName: string) => Promise<void>;
  tags: CardTag[];
}) {
  const { t } = useTranslation();
  const formId = useId();

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
                {tags.map((tag, index) => {
                  const fieldId = `${formId}-${index}`;

                  return (
                    <form
                      className={css["manager-row"]}
                      key={tag}
                      onSubmit={(evt) => {
                        evt.preventDefault();
                        const name = new FormData(evt.currentTarget).get(
                          "name",
                        );
                        if (typeof name !== "string") return;
                        void onRename(tag, name).catch(onError);
                      }}
                    >
                      <Field className={css["manager-field"]} full>
                        <FieldLabel className="sr-only" htmlFor={fieldId}>
                          {t("card_tags.manage.name")}
                        </FieldLabel>
                        <input
                          defaultValue={tag}
                          id={fieldId}
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
                          void onDelete(tag).catch(onError);
                        }}
                        type="button"
                        variant="danger"
                      >
                        {t("card_tags.manage.delete")}
                      </Button>
                    </form>
                  );
                })}
              </div>
            </DefaultModalContent>
          </ModalInner>
        </Modal>
        <ModalBackdrop />
      </DialogContent>
    </Dialog>
  );
}

function tagItemToString(item: TagItem) {
  return item.tag;
}

function renderTagResult(item: TagItem, onRemove: (() => void) | undefined) {
  return (
    <ResultTag
      className={css["tag-result"]}
      data-testid={`combobox-result-${item.code}`}
      onRemove={onRemove}
      size="sm"
    >
      {item.tag}
    </ResultTag>
  );
}
