import {
  BookOpenTextIcon,
  ChartAreaIcon,
  FileClockIcon,
  SquarePenIcon,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDialogContextChecked } from "@/components/ui/dialog.hooks";
import { Field, FieldLabel } from "@/components/ui/field";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import type { DeckValidationResult } from "@/store/lib/deck-validation";
import { deckTags } from "@/store/lib/resolve-deck";
import type { ResolvedDeck } from "@/store/lib/types";
import type { History } from "@/store/selectors/decks";
import { selectConnectionLockForDeck } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { useAccentColor } from "@/utils/use-accent-color";
import DeckDescription from "../deck-description";
import {
  DeckTags,
  DeckTagsContainer,
  LimitedCardPoolTag,
  ProviderTag,
  SealedDeckTag,
} from "../deck-tags/deck-tags";
import { DeckTools } from "../deck-tools/deck-tools";
import { Decklist } from "../decklist/decklist";
import { DecklistValidation } from "../decklist/decklist-validation";
import { FolderTag } from "../folders/folder-tag";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "../ui/modal";
import { Plane } from "../ui/plane";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useTabUrlState,
} from "../ui/tabs";
import { useToast } from "../ui/toast.hooks";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./deck-display.module.css";
import { DeckHistory } from "./deck-history/deck-history";
import { DecklistPopover } from "./decklist-popover";
import { Sidebar } from "./sidebar";
import type { DeckOrigin } from "./types";

export type DeckDisplayType = "deck" | "decklist";

export type DeckDisplayProps = {
  deck: ResolvedDeck;
  origin: DeckOrigin;
  headerSlot?: React.ReactNode;
  history?: History;
  type?: DeckDisplayType;
  validation: DeckValidationResult;
};

export function DeckDisplay(props: DeckDisplayProps) {
  const {
    deck,
    headerSlot,
    history,
    origin,
    type = "deck",
    validation,
  } = props;

  const [currentTab, setCurrentTab] = useTabUrlState("deck");
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollState = useRef<Record<string, number>>({});

  const { t } = useTranslation();
  const cssVariables = useAccentColor(deck.investigatorBack.card);
  const hasHistory = history && history?.length > 1;

  const onTabChange = useCallback(
    (val: string) => {
      if (contentRef.current) {
        scrollState.current[currentTab] = window.scrollY;
      }

      setCurrentTab(val);
    },
    [setCurrentTab, currentTab],
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      if (contentRef.current && scrollState.current[currentTab]) {
        window.scrollTo(0, scrollState.current[currentTab]);
      } else {
        window.scrollTo(0, 0);
      }
    });
  }, [currentTab]);

  const titleNode = (
    <h1 className={css["title"]} data-testid="view-title">
      {deck.name} <small>{deck.version}</small>
    </h1>
  );

  return (
    <AppLayout title={deck ? deck.name : ""}>
      <main
        className={cx(css["main"], css[origin])}
        style={cssVariables}
        data-testid="deck-display"
      >
        <header className={css["header"]}>
          {origin === "local" ? (
            <Dialog>
              <DefaultTooltip tooltip={t("deck_edit.config.title_and_tags")}>
                <DialogTrigger asChild>
                  <button
                    className={css["name-modal-trigger"]}
                    type="button"
                    data-testid="name-edit-trigger"
                  >
                    <SquarePenIcon className={css["name-modal-icon"]} />
                    {titleNode}
                  </button>
                </DialogTrigger>
              </DefaultTooltip>
              <DialogContent>
                <TitleEditModal deck={deck} />
              </DialogContent>
            </Dialog>
          ) : (
            titleNode
          )}
          <div className={css["tags"]} data-testid="view-tags">
            <DeckTagsContainer>
              {origin === "local" && (
                <>
                  <ProviderTag deck={deck} />
                  <FolderTag deckId={deck.id} />
                </>
              )}
              <LimitedCardPoolTag deck={deck} />
              <SealedDeckTag deck={deck} />
              <DeckTags tags={deckTags(deck, type === "deck" ? " " : ", ")} />
            </DeckTagsContainer>
          </div>
          {headerSlot && <div>{headerSlot}</div>}
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
          <Sidebar
            className={css["sidebar"]}
            deck={deck}
            history={history}
            innerClassName={css["sidebar-inner"]}
            origin={origin}
            type={type}
          />
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
                <Decklist deck={deck} />
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
                <DecklistPopover deck={deck} />
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

  const connectionLock = useStore((state) =>
    selectConnectionLockForDeck(state, deck),
  );

  const { t } = useTranslation();
  const toast = useToast();
  const modalContext = useDialogContextChecked();
  const cssVariables = useAccentColor(deck.investigatorBack.card);

  const updateDeckProperties = useStore((state) => state.updateDeckProperties);

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

        await updateDeckProperties(deck.id, {
          name: values.get("name")?.toString() || "",
          tags: values.get("tags")?.toString() || "",
        });

        onCloseModal();
      } catch (err) {
        toast.show({
          children: t("deck_edit.save_error", {
            error: (err as Error).message,
          }),
          variant: "error",
        });
      } finally {
        toast.dismiss(toastId);
        setLoading(false);
      }
    },
    [deck.id, updateDeckProperties, onCloseModal, toast, t],
  );

  return (
    <DialogContent>
      <Modal>
        <ModalBackdrop />
        <ModalInner size="45rem">
          <ModalActions />
          <DefaultModalContent
            title={t("deck_edit.config.title_and_tags")}
            style={cssVariables}
          >
            <form onSubmit={handleSubmit}>
              <Field full padded>
                <FieldLabel>{t("deck_edit.config.name")}</FieldLabel>
                <input
                  data-testid="name-edit-name"
                  autoComplete="off"
                  type="text"
                  name="name"
                  required
                  defaultValue={deck.name}
                />
              </Field>
              <Field full padded helpText={t("deck_edit.config.tags_help")}>
                <FieldLabel>{t("deck_edit.config.tags")}</FieldLabel>
                <input
                  autoComplete="off"
                  data-testid="name-edit-tags"
                  type="text"
                  name="tags"
                  defaultValue={deck.tags}
                />
              </Field>
              <div className={css["name-modal-footer"]}>
                <Button
                  disabled={!!connectionLock || loading}
                  variant="primary"
                  type="submit"
                  data-testid="name-edit-submit"
                  tooltip={connectionLock}
                >
                  {t("deck_edit.save_short")}
                </Button>
                <Button onClick={onCloseModal} variant="bare">
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          </DefaultModalContent>
        </ModalInner>
      </Modal>
    </DialogContent>
  );
}
