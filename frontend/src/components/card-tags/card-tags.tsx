import { CARD_TAG_NAME_MAX_LENGTH } from "@arkham-build/shared";
import { GlobeIcon, PlusIcon, Settings2Icon } from "lucide-react";
import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ResolvedDeck } from "@/store/lib/types";
import type { TagItem } from "@/store/selectors/card-tags";
import { cx } from "@/utils/cx";
import { isEmpty } from "@/utils/is-empty";
import { useResolvedDeck } from "../resolved-deck-context";
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
import { CardTagLabel } from "./card-tag-label";
import css from "./card-tags.module.css";
import { useCardTags, useDeckCardTags } from "./use-card-tags";

type Props = {
  cardCode: string;
  stacked?: boolean;
};

export function CardTags({ cardCode, stacked }: Props) {
  const { canEdit, resolvedDeck } = useResolvedDeck();

  return (
    <div className={cx(css["tags"], stacked && css["stacked"])}>
      {resolvedDeck && (
        <DeckCardTags
          cardCode={cardCode}
          deck={resolvedDeck}
          readonly={!canEdit}
        />
      )}
      <AccountCardTags cardCode={cardCode} showLabel={!!resolvedDeck} />
    </div>
  );
}

function AccountCardTags({
  cardCode,
  showLabel,
}: {
  cardCode: string;
  showLabel: boolean;
}) {
  const { t } = useTranslation();
  const { onCreateTag, onTagsChange, selectedItems, tagOptions } =
    useCardTags(cardCode);

  return (
    <div className={css["tag-section"]}>
      <CardTagCombobox
        id={`card-tags-${cardCode}`}
        label={
          <div className={css["tag-section-title"]}>
            <GlobeIcon />
            {t("card_tags.account_title")}
          </div>
        }
        onCreateTag={onCreateTag}
        onTagsChange={onTagsChange}
        placeholder={t("card_tags.placeholder")}
        selectedItems={selectedItems}
        showLabel={showLabel}
        tagOptions={tagOptions}
      />
    </div>
  );
}

function DeckCardTags({
  cardCode,
  deck,
  readonly,
}: {
  cardCode: string;
  deck: ResolvedDeck;
  readonly?: boolean;
}) {
  const { t } = useTranslation();
  const { onCreateTag, onTagsChange, selectedItems, tagOptions } =
    useDeckCardTags(cardCode, deck);

  if (readonly && isEmpty(selectedItems)) {
    return null;
  }

  return (
    <div className={css["tag-section"]}>
      <CardTagCombobox
        id={`deck-card-tags-${cardCode}`}
        label={
          <div className={css["tag-section-title"]}>
            <i className="icon-deck" />
            {t("card_tags.deck_title")}
          </div>
        }
        onCreateTag={onCreateTag}
        onTagsChange={onTagsChange}
        placeholder={t("card_tags.deck_placeholder")}
        readonly={readonly}
        selectedItems={selectedItems}
        showLabel
        tagOptions={tagOptions}
      />
    </div>
  );
}

function CardTagCombobox({
  id,
  label,
  onCreateTag,
  onTagsChange,
  placeholder,
  readonly,
  selectedItems,
  showLabel,
  tagOptions,
}: {
  id: string;
  label: React.ReactNode;
  onCreateTag: (name: string) => void;
  onTagsChange: (items: TagItem[]) => void;
  placeholder: string;
  readonly?: boolean;
  selectedItems: TagItem[];
  showLabel: boolean;
  tagOptions: TagItem[];
}) {
  const { i18n, t } = useTranslation();

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
    <Combobox
      className={css["combobox"]}
      creatable={creatable}
      id={id}
      itemToString={tagItemToString}
      items={tagOptions}
      label={label}
      locale={i18n.language}
      onValueChange={onTagsChange}
      placeholder={placeholder}
      readonly={readonly}
      renderItem={(item) => <CardTagLabel>{item.tag}</CardTagLabel>}
      renderResult={renderTagResult}
      selectedItems={selectedItems}
      showLabel={showLabel}
    />
  );
}

export function CardTagManager({ cardCode }: { cardCode: string }) {
  const { onRenameTag, onDeleteTag, tagOptions } = useCardTags(cardCode);

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
              {tagOptions.length > 0 ? (
                <div className={css["manager-list"]}>
                  {tagOptions.map(({ tag }, index) => {
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
                          onRenameTag(tag, name);
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
                            onDeleteTag(tag);
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
              ) : (
                <p>{t("common.no_entries")}</p>
              )}
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
      className={cx(css["tag-result"], !item.global && css["local"])}
      data-testid={`combobox-result-${item.code}`}
      onRemove={onRemove}
      size="sm"
    >
      <span className={css["tag-result-content"]}>
        <CardTagLabel>{item.tag}</CardTagLabel>
      </span>
    </ResultTag>
  );
}
