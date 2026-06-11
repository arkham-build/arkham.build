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
import { useImportDeckMutation } from "@/queries/mutations/decks";
import { useStore } from "@/store";
import { selectSession } from "@/store/selectors/auth";
import css from "./deck-collection.module.css";

export function DeckCollectionImport() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { importDeck, isPending } = useImportDeck();

  const session = useStore(selectSession);

  const onFormSubmit = useCallback(
    async (evt: React.SubmitEvent<HTMLFormElement>) => {
      evt.preventDefault();

      const input = new FormData(evt.currentTarget).get("deck-id")?.toString();

      try {
        await importDeck(input ?? "");
        setOpen(false);
      } catch {
        return;
      }
    },
    [importDeck],
  );

  if (session) return null;

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
              disabled={isPending}
              type="submit"
            >
              {t("deck_collection.import")}
            </Button>
            {isPending && <LoaderCircleIcon className="spin" />}
          </footer>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function useImportDeck() {
  const { t } = useTranslation();
  const toast = useToast();
  const importDeckMutation = useImportDeckMutation();

  const importDeck = useCallback(
    async (input: string) => {
      const toastId = toast.show({
        children: t("deck_collection.import_loading"),
        variant: "loading",
      });

      try {
        await importDeckMutation.mutateAsync(input);
        toast.dismiss(toastId);
      } catch (error) {
        toast.dismiss(toastId);
        toast.show({
          children: t("deck_collection.import_error", {
            error: error instanceof Error ? error.message : "Unknown error",
          }),
          variant: "error",
        });

        throw error;
      }
    },
    [importDeckMutation, t, toast],
  );

  return {
    importDeck,
    isPending: importDeckMutation.isPending,
  };
}
