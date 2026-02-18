import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CopyIcon,
  DicesIcon,
  EllipsisIcon,
  ImportIcon,
  PencilIcon,
  ShareIcon,
  Trash2Icon,
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
import type { ResolvedDeck } from "@/store/lib/types";
import type { Id } from "@/store/schemas/deck.schema";
import { selectConnectionsData } from "@/store/selectors/connections";
import type { History } from "@/store/selectors/decks";
import {
  selectConnectionLock,
  selectConnectionLockForDeck,
} from "@/store/selectors/shared";
import { localizeArkhamDBBaseUrl } from "@/utils/arkhamdb";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { cx } from "@/utils/cx";
import { isEmpty } from "@/utils/is-empty";
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
  useUploadDeck,
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

  const connectionsData = useStore(selectConnectionsData);

  const uploadDeck = useUploadDeck();
  const onUpload = useCallback(() => {
    uploadDeck(deck.id);
  }, [deck.id, uploadDeck]);

  const isReadOnly = !!deck.next_deck;

  const canUploadToArkhamDB =
    origin === "local" &&
    !isReadOnly &&
    deck.source !== "arkhamdb" &&
    !isEmpty(connectionsData);

  const onArkhamDBUpload = canUploadToArkhamDB ? onUpload : undefined;

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
          onArkhamDBUpload={onArkhamDBUpload}
          origin={origin}
          type={type}
        />
        <DeckDetails deck={deck} />
        {origin === "local" && <SidebarUpgrade deck={deck} />}

        {(origin === "arkhamdb" || deck.source === "arkhamdb") && (
          <ArkhamDBDetails deck={deck} type={type} />
        )}

        {deck.source !== "arkhamdb" && (
          <Sharing
            onArkhamDBUpload={onArkhamDBUpload}
            deck={deck}
            origin={origin}
          />
        )}
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
  onArkhamDBUpload?: () => void;
}) {
  const { history, origin, deck, onArkhamDBUpload, type } = props;

  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const search = useSearch();
  const toast = useToast();

  const [actionsOpen, setActionsOpen] = useState(false);

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(
    origin === "local" && search.includes("upgrade") && !deck.next_deck,
  );

  const connectionLock = useStore(selectConnectionLock);

  const deckConnectionLock = useStore((state) =>
    selectConnectionLockForDeck(state, deck),
  );

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
            <HotkeyTooltip keybind="e" description={t("deck.actions.edit")}>
              <Link to={`/deck/edit/${deck.id}`} asChild>
                <Button
                  data-testid="view-edit"
                  disabled={isReadOnly}
                  as="a"
                  size="full"
                >
                  <PencilIcon /> {t("deck.actions.edit_short")}
                </Button>
              </Link>
            </HotkeyTooltip>
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
              {onArkhamDBUpload && (
                <>
                  <DropdownButton
                    data-testid="view-upload"
                    disabled={!!connectionLock}
                    size="full"
                    tooltip={connectionLock}
                    variant="bare"
                    onClick={onArkhamDBUpload}
                  >
                    <i className="icon-elder_sign" />{" "}
                    {t("deck_view.actions.upload", {
                      provider: "ArkhamDB",
                    })}
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

function Sharing(props: {
  onArkhamDBUpload?: () => void;
  deck: ResolvedDeck;
  origin: DeckOrigin;
}) {
  const { deck, onArkhamDBUpload, origin } = props;
  const toast = useToast();
  const { t } = useTranslation();

  const deckData = useStore((state) => state.data.decks[props.deck.id]);
  const share = useStore((state) => state.sharing.decks[props.deck.id]);
  const devModeEnabled = useStore((state) => state.settings.devModeEnabled);

  const connectionLock = useStore(selectConnectionLock);

  const createShare = useStore((state) => state.createShare);
  const deleteShare = useStore((state) => state.deleteShare);
  const updateShare = useStore((state) => state.updateShare);

  async function withToast(fn: () => Promise<unknown>, action: string) {
    const id = toast.show({
      children: t(`deck_view.sharing.${action}`),
      variant: "loading",
    });

    try {
      await fn();
      toast.dismiss(id);
    } catch (err) {
      toast.dismiss(id);
      toast.show({
        children: t(`deck_view.sharing.${action}_failed`, {
          error: (err as Error).message,
        }),
        variant: "error",
      });
    }
  }

  const onCreateShare = async () => {
    await withToast(() => createShare(deck.id as string), "create");
  };

  const onDeleteShare = async () => {
    await withToast(() => deleteShare(deck.id as string), "delete");
  };

  const onUpdateShare = async () => {
    await withToast(() => updateShare(deckData), "update");
  };

  const isReadOnly = !!deck.next_deck;

  return (
    <section className={css["details"]} data-testid="share">
      <DeckDetail
        as="div"
        icon={<ShareIcon />}
        label={t("deck_view.sharing.title")}
      >
        {share || origin !== "local" ? (
          <div className={css["share"]}>
            <ShareInfo id={deck.id} path={`/share/${deck.id}`} />
            {origin === "local" && (
              <nav className={css["share-actions"]}>
                {devModeEnabled && <DevModeApiLinkButton id={deck.id} />}
                {deck.date_update !== share && (
                  <Button
                    disabled={isReadOnly}
                    onClick={onUpdateShare}
                    size="sm"
                  >
                    {t("deck_view.sharing.update")}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={onDeleteShare}
                  data-testid="share-delete"
                >
                  {t("deck_view.sharing.delete")}
                </Button>
              </nav>
            )}
          </div>
        ) : (
          <div className={css["share-empty"]}>
            <p>{t("deck_view.sharing.description")}</p>
            <div className={css["share-actions"]}>
              <Button
                data-testid="share-create"
                disabled={isReadOnly}
                onClick={onCreateShare}
                size="sm"
                tooltip={
                  <Trans
                    t={t}
                    i18nKey="deck_view.sharing.create_tooltip"
                    components={{ br: <br />, strong: <strong /> }}
                  />
                }
              >
                <ShareIcon />
                {t("deck_view.sharing.create")}
              </Button>
              {onArkhamDBUpload && (
                <Button
                  data-testid="view-upload"
                  disabled={!!connectionLock}
                  onClick={onArkhamDBUpload}
                  tooltip={connectionLock}
                  size="sm"
                >
                  <i className="icon-elder_sign" />{" "}
                  {t("deck_view.actions.upload", { provider: "ArkhamDB" })}
                </Button>
              )}
            </div>
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
      variant="link"
      size="sm"
    >
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
            {devModeEnabled && type === "deck" && (
              <DevModeApiLinkButton id={deck.id} />
            )}
            <Button
              as="a"
              href={`${localizeArkhamDBBaseUrl()}/deck/view/${deck.id}`}
              size="sm"
              rel="noreferrer"
              target="_blank"
            >
              {t("deck_view.connections.view", { provider: "ArkhamDB" })}
            </Button>
          </nav>
        </DeckDetail>
      </section>
      <section className={css["details"]} data-testid="share">
        <DeckDetail
          as="div"
          icon={<ShareIcon />}
          label={t("deck_view.sharing.title")}
        >
          <ShareInfo id={deck.id} path={`/deck/view/${deck.id}`} />
        </DeckDetail>
      </section>
    </>
  );
}
