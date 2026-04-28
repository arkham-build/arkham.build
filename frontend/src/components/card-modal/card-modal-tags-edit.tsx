import { GlobeIcon, LayersIcon, XIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Id } from "@/store/schemas/deck.schema";
import { Tag } from "../ui/tag";
import css from "./card-modal.module.css";

const TAG_MAX_LENGTH = 24;

function normalizeTag(raw: string): string {
  return raw.trim();
}

function isValidTag(tag: string): boolean {
  return tag.length > 0 && tag.length <= TAG_MAX_LENGTH;
}

type Props = {
  cardCode: string;
  // When undefined, no deck context — only global section is shown.
  deckId?: Id;
  deckTags?: string[];
  deckEditable?: boolean;
  globalTags: string[];
};

export function CardTagsEdit(props: Props) {
  const {
    cardCode,
    deckId,
    deckTags = [],
    deckEditable = false,
    globalTags,
  } = props;
  const { t } = useTranslation();

  const updateCardTags = useStore((state) => state.updateCardTags);
  const updateGlobalCardTags = useStore((state) => state.updateGlobalCardTags);

  const [deckInput, setDeckInput] = useState("");
  const [globalInput, setGlobalInput] = useState("");
  const [deckError, setDeckError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const addDeckTag = useCallback(
    (raw: string) => {
      if (!deckId) return;
      const tag = normalizeTag(raw);
      if (!tag) return;
      if (!isValidTag(tag)) {
        setDeckError(t("card_modal.tags.too_long", { max: TAG_MAX_LENGTH }));
        return;
      }
      setDeckError(null);
      updateCardTags(
        deckId,
        cardCode,
        deckTags.includes(tag) ? deckTags : [...deckTags, tag],
      );
      setDeckInput("");
    },
    [deckId, deckTags, cardCode, updateCardTags, t],
  );

  const addGlobalTag = useCallback(
    (raw: string) => {
      const tag = normalizeTag(raw);
      if (!tag) return;
      if (!isValidTag(tag)) {
        setGlobalError(t("card_modal.tags.too_long", { max: TAG_MAX_LENGTH }));
        return;
      }
      setGlobalError(null);
      updateGlobalCardTags(
        cardCode,
        globalTags.includes(tag) ? globalTags : [...globalTags, tag],
      );
      setGlobalInput("");
    },
    [globalTags, cardCode, updateGlobalCardTags, t],
  );

  const removeDeckTag = useCallback(
    (tag: string) => {
      if (!deckId) return;
      updateCardTags(
        deckId,
        cardCode,
        deckTags.filter((t) => t !== tag),
      );
    },
    [updateCardTags, deckId, cardCode, deckTags],
  );

  const removeGlobalTag = useCallback(
    (tag: string) => {
      updateGlobalCardTags(
        cardCode,
        globalTags.filter((t) => t !== tag),
      );
    },
    [updateGlobalCardTags, cardCode, globalTags],
  );

  const onDeckKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addDeckTag(deckInput);
      }
    },
    [addDeckTag, deckInput],
  );

  const onGlobalKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addGlobalTag(globalInput);
      }
    },
    [addGlobalTag, globalInput],
  );

  const onDeckInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (!val.includes(",")) {
        setDeckInput(val);
        setDeckError(null);
      } else {
        addDeckTag(val.replace(/,/g, ""));
      }
    },
    [addDeckTag],
  );

  const onGlobalInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (!val.includes(",")) {
        setGlobalInput(val);
        setGlobalError(null);
      } else {
        addGlobalTag(val.replace(/,/g, ""));
      }
    },
    [addGlobalTag],
  );

  const hasDeckSection = deckId != null;

  return (
    <div className={css["tags-edit"]}>
      {hasDeckSection && (
        <div className={css["tags-section"]}>
          <span className={css["tags-section-label"]}>
            {t("card_modal.tags.scope_deck")}
          </span>
          {deckTags.length > 0 && (
            <div className={css["tags-chips"]}>
              {deckTags.map((tag) => (
                <Tag key={tag} size="xs" className={css["tag-chip"]}>
                  <LayersIcon className={css["tag-global-icon"]} size={10} />
                  {tag}
                  {deckEditable && (
                    <button
                      type="button"
                      className={css["tag-remove"]}
                      onClick={() => removeDeckTag(tag)}
                      aria-label={t("card_modal.tags.remove", { tag })}
                    >
                      <XIcon size={10} />
                    </button>
                  )}
                </Tag>
              ))}
            </div>
          )}
          {deckEditable && (
            <>
              <input
                className={css["tags-input"]}
                type="text"
                value={deckInput}
                onChange={onDeckInputChange}
                onKeyDown={onDeckKeyDown}
                maxLength={TAG_MAX_LENGTH}
                placeholder={t("card_modal.tags.placeholder")}
              />
              {deckError && <p className={css["tags-error"]}>{deckError}</p>}
            </>
          )}
        </div>
      )}

      <div className={css["tags-section"]}>
        <span className={css["tags-section-label"]}>
          {t("card_modal.tags.scope_global")}
        </span>
        {globalTags.length > 0 && (
          <div className={css["tags-chips"]}>
            {globalTags.map((tag) => (
              <Tag key={tag} size="xs" className={css["tag-chip-global"]}>
                <GlobeIcon className={css["tag-global-icon"]} size={10} />
                {tag}
                <button
                  type="button"
                  className={css["tag-remove"]}
                  onClick={() => removeGlobalTag(tag)}
                  aria-label={t("card_modal.tags.remove_global", { tag })}
                >
                  <XIcon size={10} />
                </button>
              </Tag>
            ))}
          </div>
        )}
        <input
          className={css["tags-input"]}
          type="text"
          value={globalInput}
          onChange={onGlobalInputChange}
          onKeyDown={onGlobalKeyDown}
          maxLength={TAG_MAX_LENGTH}
          placeholder={t("card_modal.tags.placeholder")}
        />
        {globalError && <p className={css["tags-error"]}>{globalError}</p>}
      </div>
    </div>
  );
}
