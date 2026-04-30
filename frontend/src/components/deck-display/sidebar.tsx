import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CopyIcon,
  DicesIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  ImportIcon,
  PencilIcon,
  ShareIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useLocation, useSearch } from "wouter";
import { DeckInvestigator } from "@/components/deck-investigator/deck-investigator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownButton, DropdownMenu } from "@/components/ui/dropdown-menu";
import { Notice } from "@/components/ui/notice";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/toast.hooks";
import { UpgradeModal } from "@/pages/deck-view/upgrade-modal";
import { useStore } from "@/store";
import { isSyncedStorageProvider } from "@/store/lib/sync";
import type { ResolvedDeck } from "@/store/lib/types";
import type { Id } from "@/store/schemas/deck.schema";
import { selectDeckCreateStorageProviderOptions } from "@/store/selectors/deck-create";
import type { History } from "@/store/selectors/decks";
import { localizeArkhamDBBaseUrl } from "@/utils/arkhamdb";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { cx } from "@/utils/cx";
import { useHotkey } from "@/utils/use-hotkey";
import { DeckDetail, DeckDetails } from "../deck-details";
import { DeckInvestigatorModal } from "../deck-investigator/deck-investigator-modal";
import { SuziStandaloneSetupDialog } from "../suzi-standalone-setup/suzi-standalone-setup";
import { CopyToClipboard } from "../ui/copy-to-clipboard";
import { HotkeyTooltip } from "../ui/hotkey";
import type { DeckDisplayType } from "./deck-display";
import { LatestUpgrade } from "./deck-history/latest-upgrade";
import {
  useChangeArchiveStatus,
  useDeleteDeck,
  useDeleteUpgrade,
  useDuplicateDeck,
  useExportJson,
  useExportText,
  useUploadDeckToProvider,
} from "./hooks";
import css from "./sidebar.module.css";
import type { DeckOrigin } from "./types";

type Props = {
  className?: string;
  history?: History;
  innerClassName?: string;
  origin: DeckOrigin;
  deck: ResolvedDeck;
  type: DeckDisplayType;
};

export function Sidebar(props: Props) {
  const { className, history, innerClassName, origin, deck, type } = props;

  return (
    <div className={className}>
      <div className={cx(css["container"], innerClassName)}>
        <DeckInvestigator deck={deck} size="tooltip" titleLinks="dialog" />
        <DialogContent>
          <DeckInvestigatorModal deck={deck} readonly />
        </DialogContent>

        <SidebarActions
          deck={deck}
          history={history}
          origin={origin}
          type={type}
        />
        <DeckDetails deck={deck} />
        {origin === "local" && <SidebarUpgrade deck={deck} />}

        {(origin === "arkhamdb" || deck.source === "arkhamdb") && (
          <ArkhamDBDetails deck={deck} type={type} />
        )}

        {deck.source !== "arkhamdb" && <Sharing deck={deck} origin={origin} />}
      </div>
    </div>
  );
}

function SidebarUpgrade(props: { deck: ResolvedDeck }) {
  const { deck } = props;
  const { t } = useTranslation();

  if (!deck.previous_deck) return null;

  return (
    <section className={css["details"]} data-testid="view-latest-upgrade">
      <DeckDetail
        as="div"
        icon={<i className="icon-upgrade" />}
        label={t("deck.latest_upgrade.title")}
      >
        <LatestUpgrade deck={deck} readonly />
      </DeckDetail>
    </section>
  );
}

function SidebarActions(props: {
  origin: DeckOrigin;
  deck: ResolvedDeck;
  history?: History;
  type: DeckDisplayType;
}) {
  const { history, origin, deck, type } = props;

  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const search = useSearch();
  const toast = useToast();

  const [actionsOpen, setActionsOpen] = useState(false);

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(
    origin === "local" && search.includes("upgrade") && !deck.next_deck,
  );

  const deckConnectionLock = ""; // XXX

  const deleteDeck = useDeleteDeck();

  const onDelete = useCallback(
    () => deleteDeck(deck.id),
    [deck.id, deleteDeck],
  );

  const deleteUpgrade = useDeleteUpgrade();

  const onDeleteUpgrade = useCallback(
    () => deleteUpgrade(deck.id),
    [deleteUpgrade, deck.id],
  );

  const onDeleteLatest = useCallback(() => {
    if (deck.previous_deck) {
      deleteUpgrade(deck.id);
    } else {
      onDelete();
    }
  }, [deleteUpgrade, onDelete, deck]);

  const exportJson = useExportJson();

  const onExportJson = useCallback(
    () => exportJson(deck.originalDeck),
    [deck, exportJson],
  );

  const exportText = useExportText();

  const onExportText = useCallback(() => exportText(deck), [deck, exportText]);

  const duplicateDeck = useDuplicateDeck();

  const onDuplicate = useCallback(() => {
    setActionsOpen(false);
    duplicateDeck(deck.id);
  }, [deck.id, duplicateDeck]);

  const uploadDeckToProvider = useUploadDeckToProvider();

  const onRemoteUpload = useCallback(() => {
    setActionsOpen(false);
    uploadDeckToProvider(deck.id);
  }, [deck.id, uploadDeckToProvider]);

  const onUpgradeModalOpenChange = useCallback((val: boolean) => {
    setUpgradeModalOpen(val);
    if (!val && window.location.hash.includes("upgrade")) {
      window.history.replaceState(null, "", " ");
    }
  }, []);

  const onOpenUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(true);
  }, []);

  const onEdit = useCallback(() => {
    navigate(`/deck/edit/${deck.id}`);
  }, [deck.id, navigate]);

  const importSharedDeck = useStore((state) => state.importSharedDeck);

  const { isArchived, toggleArchived } = useChangeArchiveStatus(deck.id);

  const onImport = useCallback(async () => {
    try {
      const id = await importSharedDeck(deck, type);

      navigate(`/deck/view/${id}`);
    } catch (err) {
      toast.show({
        children: t("deck_view.import_failed", {
          error: (err as Error).message,
        }),
        variant: "error",
      });
    }
  }, [deck, importSharedDeck, toast.show, navigate, t, type]);

  const isReadOnly = !!deck.next_deck;
  const isLocal = origin === "local";
  const isLocalOnly = isLocal && !deck.source;

  const storageProviderOptions = useStore(
    selectDeckCreateStorageProviderOptions,
  );
  const remoteProvider = storageProviderOptions.find(
    (option) => option.value === "remote",
  );

  useHotkey("e", onEdit, { disabled: isReadOnly || !isLocal });
  useHotkey("u", onOpenUpgradeModal, { disabled: isReadOnly || !isLocal });
  useHotkey("cmd+a", toggleArchived, { disabled: !isLocal });
  useHotkey("cmd+backspace", onDelete, { disabled: isReadOnly || !isLocal });
  useHotkey("cmd+shift+backspace", onDeleteLatest, {
    disabled: isReadOnly || !isLocal,
  });
  useHotkey("cmd+i", onImport, { disabled: isLocal });
  useHotkey("cmd+d", onDuplicate, { disabled: !isLocal });

  const originPrefix = origin !== "share" ? `/${type}/view/` : "/share/";

  const nextDeck = isReadOnly ? `${originPrefix}${deck.next_deck}` : undefined;

  const latestId = history?.[0]?.id;
  const latestDeck =
    latestId && deck.id !== latestId ? `${originPrefix}${latestId}` : undefined;

  return (
    <>
      {(nextDeck || latestDeck) && (
        <Notice variant="info">
          {nextDeck && (
            <Trans
              t={t}
              i18nKey="deck_view.newer_version"
              components={{ a: <Link href={nextDeck} /> }}
            />
          )}
          {latestDeck && (
            <>
              {" "}
              <Trans
                t={t}
                i18nKey="deck_view.latest_version"
                components={{ a: <Link href={latestDeck} /> }}
              />
            </>
          )}
        </Notice>
      )}
      <div className={css["actions"]}>
        {origin === "local" ? (
          <>
            <Link to={`/deck/edit/${deck.id}`} asChild>
              <HotkeyTooltip keybind="e" description={t("deck.actions.edit")}>
                <Button
                  data-testid="view-edit"
                  disabled={isReadOnly}
                  as="a"
                  size="full"
                >
                  <PencilIcon /> {t("deck.actions.edit_short")}
                </Button>
              </HotkeyTooltip>
            </Link>
            <Dialog
              onOpenChange={onUpgradeModalOpenChange}
              open={upgradeModalOpen}
            >
              <HotkeyTooltip
                keybind="u"
                description={t("deck.actions.upgrade")}
              >
                <DialogTrigger asChild>
                  <Button
                    data-testid="view-upgrade"
                    disabled={isReadOnly}
                    size="full"
                  >
                    <i className="icon-xp-bold" />{" "}
                    {t("deck.actions.upgrade_short")}
                  </Button>
                </DialogTrigger>
              </HotkeyTooltip>
              <DialogContent>
                <UpgradeModal deck={deck} />
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <HotkeyTooltip
            keybind="cmd+i"
            description={t("deck_view.actions.import")}
          >
            <Button size="full" onClick={onImport} data-testid="share-import">
              <ImportIcon /> {t("deck_view.actions.import")}
            </Button>
          </HotkeyTooltip>
        )}
        <Popover
          modal
          placement="bottom-start"
          open={actionsOpen}
          onOpenChange={setActionsOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant="bare"
              data-testid="view-more-actions"
              aria-label={t("common.more_actions")}
            >
              <EllipsisIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <DropdownMenu>
              {deck.investigatorBack.card.code === SPECIAL_CARD_CODES.SUZI && (
                <>
                  <SuziStandaloneSetupDialog deck={deck}>
                    <DropdownButton data-testid="view-suzi-chaos-mode">
                      <DicesIcon />
                      {t("suzi_standalone_setup.title_short")}
                    </DropdownButton>
                  </SuziStandaloneSetupDialog>

                  <hr />
                </>
              )}
              {origin === "local" && (
                <>
                  <DropdownButton
                    hotkey="cmd+d"
                    data-testid="view-duplicate"
                    onClick={onDuplicate}
                  >
                    <CopyIcon />
                    {t("deck.actions.duplicate_short")}
                  </DropdownButton>
                  {isLocalOnly && !!remoteProvider && (
                    <DropdownButton
                      data-testid="view-upload-remote"
                      onClick={onRemoteUpload}
                    >
                      <UploadIcon />
                      {t("deck_view.actions.upload", {
                        provider: remoteProvider.label,
                      })}
                    </DropdownButton>
                  )}
                  <DropdownButton
                    data-testid="view-archive"
                    hotkey="cmd+a"
                    onClick={toggleArchived}
                  >
                    {isArchived ? (
                      <>
                        <ArchiveRestoreIcon />
                        {t("deck.actions.unarchive")}
                      </>
                    ) : (
                      <>
                        <ArchiveIcon />
                        {t("deck.actions.archive")}
                      </>
                    )}
                  </DropdownButton>
                  <hr />
                </>
              )}
              <DropdownButton
                data-testid="view-export-json"
                onClick={onExportJson}
              >
                {t("deck.actions.export_json")}
              </DropdownButton>
              <DropdownButton
                data-testid="view-export-text"
                onClick={onExportText}
              >
                {t("deck.actions.export_text")}
              </DropdownButton>
              {origin === "local" && (
                <>
                  <hr />
                  {!!deck.previous_deck && (
                    <DropdownButton
                      data-testid="view-delete-upgrade"
                      disabled={isReadOnly || !!deckConnectionLock}
                      hotkey="cmd+shift+backspace"
                      onClick={onDeleteUpgrade}
                      tooltip={deckConnectionLock}
                    >
                      <i className="icon-xp-bold" />{" "}
                      {t("deck.actions.delete_upgrade")}
                    </DropdownButton>
                  )}
                  <DropdownButton
                    data-testid="view-delete"
                    disabled={isReadOnly || !!deckConnectionLock}
                    hotkey="cmd+backspace"
                    onClick={onDelete}
                    tooltip={deckConnectionLock}
                  >
                    <Trash2Icon /> {t("deck.actions.delete")}
                  </DropdownButton>
                </>
              )}
            </DropdownMenu>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}

function Sharing(props: { deck: ResolvedDeck; origin: DeckOrigin }) {
  const { deck, origin } = props;
  const { t } = useTranslation();

  const devModeEnabled = useStore((state) => state.settings.devModeEnabled);

  const isSynced = isSyncedStorageProvider(deck.source);

  const uploadDeckToProvider = useStore((state) => state.uploadDeckToProvider);

  const onUpload = () => {
    uploadDeckToProvider(deck.id, "remote");
  };

  return (
    <section className={css["details"]} data-testid="share">
      <DeckDetail
        as="div"
        icon={<ShareIcon />}
        label={t("deck_view.sharing.title")}
      >
        {isSynced ? (
          <div className={css["share"]}>
            <ShareInfo id={deck.id} path={`/share/${deck.id}`} />
            {(origin === "local" || devModeEnabled) && (
              <nav className={css["share-actions"]}>
                {devModeEnabled && <DevModeApiLinkButton id={deck.id} />}
              </nav>
            )}
          </div>
        ) : (
          <div className={css["share-empty"]}>
            <p>{t("deck_view.sharing.description")}</p>
            <Button onClick={onUpload} size="sm">
              <UploadIcon />
              {t("deck_view.actions.upload", {
                provider: t("deck_edit.config.storage_provider.remote"),
              })}
            </Button>
          </div>
        )}
      </DeckDetail>
    </section>
  );
}

function ShareInfo(props: { id: Id; path: string }) {
  const { id, path } = props;
  const { t } = useTranslation();

  return (
    <>
      <p>
        <Trans
          t={t}
          i18nKey="deck_view.sharing.description_present"
          components={{
            a: (
              // biome-ignore lint/a11y/useAnchorContent: interpolation.
              <a
                data-testid="share-link"
                href={path}
                target="_blank"
                rel="noreferrer"
              />
            ),
          }}
        />
        <CopyToClipboard
          className={css["share-copy"]}
          text={`${window.location.origin}${path}`}
          variant="bare"
        />
      </p>
      <p>
        {t("deck.id")}: <code>{id}</code>
        <CopyToClipboard
          className={css["share-copy"]}
          text={`${id}`}
          variant="bare"
        />
      </p>
    </>
  );
}

function DevModeApiLinkButton({ id }: { id: Id }) {
  const { t } = useTranslation();
  return (
    <Button
      as="a"
      data-testid="share-api-link"
      href={`${import.meta.env.VITE_API_LEGACY_URL}/v1/public/share/${id}`}
      rel="noreferrer"
      target="_blank"
      size="sm"
    >
      <ExternalLinkIcon />
      {t("deck_view.sharing.api_link")}
    </Button>
  );
}

function ArkhamDBDetails(props: { deck: ResolvedDeck; type: DeckDisplayType }) {
  const { deck, type } = props;
  const { t } = useTranslation();

  const devModeEnabled = useStore((state) => state.settings.devModeEnabled);

  return (
    <>
      <section className={css["details"]} data-testid="share">
        <DeckDetail
          as="div"
          icon={<i className="icon-elder_sign" />}
          label="ArkhamDB"
        >
          <p>
            {t("deck_view.connections.description", { provider: "ArkhamDB" })}
          </p>
          <nav className={css["share-actions"]}>
            <Button
              as="a"
              href={`${localizeArkhamDBBaseUrl()}/${type}/view/${deck.id}`}
              size="sm"
              rel="noreferrer"
              target="_blank"
            >
              {t("deck_view.connections.view", { provider: "ArkhamDB" })}
            </Button>
            {devModeEnabled && type === "deck" && (
              <DevModeApiLinkButton id={deck.id} />
            )}
          </nav>
        </DeckDetail>
      </section>
      <section className={css["details"]} data-testid="share">
        <DeckDetail
          as="div"
          icon={<ShareIcon />}
          label={t("deck_view.sharing.title")}
        >
          <ShareInfo id={deck.id} path={`/${type}/view/${deck.id}`} />
        </DeckDetail>
      </section>
    </>
  );
}
