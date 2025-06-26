import { CloudDownloadIcon, LoaderCircleIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import css from "./deck-collection.module.css";

export function DeckCollectionImport() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const importDeck = useStore((state) => state.importDeck);

  const toast = useToast();

  const onFormSubmit = useCallback(
    async (evt: React.FormEvent) => {
      evt.preventDefault();

      if (evt.currentTarget instanceof HTMLFormElement) {
        const input = new FormData(evt.currentTarget)
          .get("deck-id")
          ?.toString();
        setLoading(true);

        try {
          await importDeck(input ?? "");

          toast.show({
            children: "Deck import successful.",
            duration: 3000,
            variant: "success",
          });

          setOpen(false);
        } catch (err) {
          toast.show({
            children: `Error: ${err instanceof Error ? err.message : "Unknown error."}`,
            variant: "error",
          });
        } finally {
          setLoading(false);
        }
      }
    },
    [importDeck, toast.show],
  );

  return (
    <Popover onOpenChange={setOpen} open={open} placement="bottom-start">
      <PopoverTrigger asChild>
        <Button
          data-testid="import-trigger"
          tooltip={t("deck_collection.import_arkhamdb")}
        >
          <CloudDownloadIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <form className={css["import"]} onSubmit={onFormSubmit}>
          <header className={css["deck-collection-form-header"]}>
            <h3>{t("deck_collection.import_arkhamdb")}</h3>
          </header>
          <Field
            full
            helpText={
              <Trans
                i18nKey="deck_collection.import_arkhamdb_help"
                t={t}
                components={{
                  strong: <strong />,
                  settings_link: <Link href="/settings" />,
                }}
              />
            }
          >
            <label className="sr-only" htmlFor="deck-id">
              {t("deck_collection.deck_url_or_id")}
            </label>
            <input
              autoComplete="off"
              data-1p-ignore=""
              data-testid="import-input"
              name="deck-id"
              placeholder="https://arkhamdb.com/deck/view/123456"
              required
              type="text"
            />
          </Field>
          <footer className={css["import-footer"]}>
            <Button
              data-testid="import-submit"
              disabled={loading}
              type="submit"
            >
              {t("deck_collection.import")}
            </Button>
            {loading && <LoaderCircleIcon className="spin" />}
          </footer>
        </form>
      </PopoverContent>
    </Popover>
  );
}
