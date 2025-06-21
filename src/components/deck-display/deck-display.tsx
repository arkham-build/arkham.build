import { AppLayout } from "@/layouts/app-layout";
import type { DeckValidationResult } from "@/store/lib/deck-validation";
import { deckTags, extendedDeckTags } from "@/store/lib/resolve-deck";
import type { ResolvedDeck } from "@/store/lib/types";
import type { History } from "@/store/selectors/decks";
import { isEmpty } from "@/utils/is-empty";
import { useAccentColor } from "@/utils/use-accent-color";
import {
  BookOpenTextIcon,
  ChartAreaIcon,
  FileClockIcon,
  SquarePenIcon,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import DeckDescription from "../deck-description";
import { DeckTags } from "../deck-tags";
import { DeckTools } from "../deck-tools/deck-tools";
import { Decklist } from "../decklist/decklist";
import { DecklistValidation } from "../decklist/decklist-validation";
import type { ViewMode } from "../decklist/decklist.types";
import {
  LimitedCardPoolTag,
  SealedDeckTag,
} from "../limited-card-pool/limited-card-pool";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Modal, ModalContent } from "../ui/modal";
import { Plane } from "../ui/plane";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useTabUrlState,
} from "../ui/tabs";
import { DeckHistory } from "./deck-history/deck-history";
import { Sidebar } from "./sidebar";
import type { DeckOrigin } from "./types";

import { useDialogContextChecked } from "@/components/ui/dialog.hooks";
import { Field, FieldLabel } from "@/components/ui/field";
import { useStore } from "@/store";
import { useToast } from "../ui/toast.hooks";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./deck-display.module.css";

export type DeckDisplayProps = {
  deck: ResolvedDeck;
  origin: DeckOrigin;
  history?: History;
  validation: DeckValidationResult;
};

export function DeckDisplay(props: DeckDisplayProps) {
  const { origin, deck, history, validation } = props;

  const [viewMode, setViewMode] = useTabUrlState("list", "view_mode");
  const [currentTab, setCurrentTab] = useTabUrlState("deck");
  const contentRef = useRef<HTMLDivElement>(null);

  const { t } = useTranslation();
  const cssVariables = useAccentColor(deck.investigatorBack.card.faction_code);
  const hasHistory = !isEmpty(history);

  const onTabChange = useCallback(
    (val: string) => {
      setCurrentTab(val);
    },
    [setCurrentTab],
  );

  return (
    <AppLayout title={deck ? deck.name : ""}>
      <main className={css["main"]} style={cssVariables}>
        <header className={css["header"]}>
          <Dialog>
            <DialogTrigger asChild>
              <button className={css["title-modal-trigger"]} type="button">
                <DefaultTooltip tooltip={t("deck_edit.config.title_and_tags")}>
                  <SquarePenIcon className={css["title-modal-icon"]} />
                </DefaultTooltip>
                <h1 className={css["title"]} data-testid="view-title">
                  {deck.name} <small>{deck.version}</small>
                </h1>
              </button>
            </DialogTrigger>
            <DialogContent>
              <TitleEditModal deck={deck} />
            </DialogContent>
          </Dialog>

          <div className={css["tags"]}>
            <DeckTags
              tags={
                origin === "local"
                  ? extendedDeckTags(deck, false)
                  : deckTags(deck)
              }
            />
            <LimitedCardPoolTag />
            <SealedDeckTag />
          </div>
          {deck.metaParsed?.banner_url && (
            <div className={css["banner"]}>
              <img alt="Deck banner" src={deck.metaParsed.banner_url} />
            </div>
          )}
          {deck.metaParsed.intro_md && (
            <Plane>
              <DeckDescription content={deck.metaParsed.intro_md} centered />
            </Plane>
          )}
        </header>

        <Dialog>
          <Sidebar className={css["sidebar"]} deck={deck} origin={origin} />
        </Dialog>

        <div className={css["content"]}>
          <Tabs
            className={css["tabs"]}
            value={currentTab}
            onValueChange={onTabChange}
            ref={contentRef}
          >
            <TabsList className={css["list"]}>
              <TabsTrigger
                data-testid="tab-deck"
                hotkey="d"
                onTabChange={onTabChange}
                tooltip={t("deck_view.tab_deck_list")}
                value="deck"
              >
                <i className="icon-deck" />
                <span>{t("deck_view.tab_deck_list")}</span>
              </TabsTrigger>
              {deck.description_md && (
                <TabsTrigger
                  data-testid="tab-notes"
                  hotkey="n"
                  onTabChange={onTabChange}
                  tooltip={t("deck_view.tab_notes")}
                  value="notes"
                >
                  <BookOpenTextIcon />
                  <span>{t("deck_view.tab_notes")}</span>
                </TabsTrigger>
              )}
              <TabsTrigger
                hotkey="t"
                onTabChange={onTabChange}
                tooltip={t("deck_view.tab_tools")}
                value="tools"
              >
                <ChartAreaIcon />
                <span>{t("deck_view.tab_tools")}</span>
              </TabsTrigger>
              {hasHistory && (
                <TabsTrigger
                  data-testid="tab-history"
                  hotkey="h"
                  onTabChange={onTabChange}
                  tooltip={t("deck_view.tab_history")}
                  value="history"
                >
                  <FileClockIcon />
                  <span>
                    {t("deck_view.tab_history")} ({history.length - 1})
                  </span>
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent className={css["tab"]} value="deck">
              <div className={css["tab-content"]}>
                <DecklistValidation
                  defaultOpen={validation.errors.length < 3}
                  validation={validation}
                />
                <Decklist
                  deck={deck}
                  viewMode={viewMode as ViewMode}
                  setViewMode={setViewMode}
                />
              </div>
            </TabsContent>
            <TabsContent className={css["tab"]} value="tools">
              <DeckTools deck={deck} readonly />
            </TabsContent>
            {deck.description_md && (
              <TabsContent className={css["tab"]} value="notes">
                <Plane>
                  <DeckDescription content={deck.description_md} centered />
                </Plane>
              </TabsContent>
            )}
            {hasHistory && (
              <TabsContent className={css["tab"]} value="history">
                <DeckHistory deck={deck} history={history} origin={origin} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </AppLayout>
  );
}

type TitleEditModalProps = {
  deck: ResolvedDeck;
};

function TitleEditModal(props: TitleEditModalProps) {
  const { deck } = props;

  const [loading, setLoading] = useState(false);

  const { t } = useTranslation();
  const toast = useToast();
  const modalContext = useDialogContextChecked();
  const cssVariables = useAccentColor(deck.investigatorBack.card.faction_code);

  const updateNameAndTag = useStore((state) => state.updateNameAndTag);

  const onCloseModal = useCallback(() => {
    modalContext?.setOpen(false);
  }, [modalContext]);

  const handleSubmit = useCallback(
    async (evt: React.FormEvent) => {
      evt.preventDefault();

      setLoading(true);

      const toastId = toast.show({
        children: t("deck_edit.save_loading"),
        variant: "loading",
      });

      try {
        const values = new FormData(evt.target as HTMLFormElement);

        await updateNameAndTag(deck.id, {
          name: values.get("name")?.toString() || "",
          tags: values.get("tags")?.toString() || "",
        });

        toast.show({
          children: t("deck_edit.save_success"),
          variant: "success",
        });

        onCloseModal();
      } catch (err) {
        toast.show({
          children: t("deck_edit.save_error", {
            message: (err as Error).message,
          }),
          variant: "error",
        });
      } finally {
        toast.dismiss(toastId);
        setLoading(false);
      }
    },
    [deck.id, updateNameAndTag, onCloseModal, toast, t],
  );

  return (
    <DialogContent>
      <Modal size="45rem" onClose={onCloseModal}>
        <ModalContent
          title={t("deck_edit.config.title_and_tags")}
          style={cssVariables}
        >
          <form onSubmit={handleSubmit}>
            <Field full padded>
              <FieldLabel>{t("deck_edit.config.name")}</FieldLabel>
              <input
                autoComplete="off"
                type="text"
                name="name"
                required
                defaultValue={deck.name}
              />
            </Field>
            <Field full padded helpText={t("deck_edit.config.tags_help")}>
              <FieldLabel>{t("deck_edit.config.tags")}</FieldLabel>
              <input type="text" name="tags" defaultValue={deck.tags} />
            </Field>
            <div className={css["title-modal-footer"]}>
              <Button disabled={loading} variant="primary" type="submit">
                {t("deck_edit.save_short")}
              </Button>
              <Button onClick={onCloseModal} variant="bare">
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </ModalContent>
      </Modal>
    </DialogContent>
  );
}
