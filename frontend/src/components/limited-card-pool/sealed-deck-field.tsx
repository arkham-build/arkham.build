import { BookLockIcon, XIcon } from "lucide-react";
import { useCallback } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { SealedDeck } from "@/store/lib/types";
import { assert } from "@/utils/assert";
import { parseCsv } from "@/utils/parse-csv";
import { Button } from "../ui/button";
import { Field, FieldLabel } from "../ui/field";
import { FileInput } from "../ui/file-input";
import { Tag } from "../ui/tag";
import { useToast } from "../ui/toast.hooks";
import css from "./limited-card-pool.module.css";

export function SealedDeckField(props: {
  onValueChange: (payload: SealedDeck | undefined) => void;
  value?: SealedDeck;
}) {
  const { onValueChange, value } = props;

  const { t } = useTranslation();
  const toast = useToast();

  const onChangeFile = useCallback(
    async (evt: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = evt.target;
      if (!files || !files.length) return;

      const file = files[0];
      const fileText = await file.text();

      try {
        const parsed = parseCsv(fileText);
        assert(
          parsed.every(isCardRow),
          "File is not a sealed deck definition.",
        );
        onValueChange({
          name: file.name.split(".csv")[0],
          cards: parsed.reduce(
            (acc, curr) => {
              acc[curr.code] = curr.quantity;
              return acc;
            },
            {} as Record<string, number>,
          ),
        });
      } catch (err) {
        toast.show({
          children:
            (err as Error)?.message ??
            "Unknown error while parsing sealed deck.",
          variant: "error",
          duration: 5000,
        });
      }
    },
    [onValueChange, toast.show],
  );

  return (
    <Field
      data-testid="sealed-deck-field"
      full
      padded
      helpText={
        <Trans
          t={t}
          i18nKey="deck_edit.config.sealed.help"
          components={{
            a: (
              // biome-ignore lint/a11y/useAnchorContent: interpolation.
              <a
                href="https://www.arkhamsealed.com/"
                target="_blank"
                rel="noopener noreferrer"
              />
            ),
          }}
        />
      }
    >
      <FieldLabel as="div">{t("deck_edit.config.sealed.title")}</FieldLabel>
      <div className={css["sealed"]}>
        <div>
          <FileInput
            id="sealed-deck"
            accept="text/csv"
            onChange={onChangeFile}
            size="sm"
          >
            <BookLockIcon /> {t("deck_edit.config.sealed.add")}
          </FileInput>
        </div>
        {value && (
          <Tag size="xs">
            {value.name} ({Object.keys(value.cards).length} cards)
            <Button
              data-testid="sealed-deck-remove"
              onClick={() => onValueChange(undefined)}
              iconOnly
              size="xs"
              variant="bare"
            >
              <XIcon />
            </Button>
          </Tag>
        )}
      </div>
    </Field>
  );
}

type CardRow = {
  code: string;
  quantity: number;
};

function isCardRow(x: unknown): x is CardRow {
  return (
    typeof x === "object" &&
    x != null &&
    "code" in x &&
    "quantity" in x &&
    typeof x.code === "string" &&
    typeof x.quantity === "string" &&
    x.code.length > 0 &&
    x.code.length < 10 &&
    Number.isSafeInteger(Number.parseInt(x.quantity, 10))
  );
}
