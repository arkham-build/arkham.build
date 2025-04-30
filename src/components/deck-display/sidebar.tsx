import { DeckInvestigator } from "@/components/deck-investigator/deck-investigator";
import { FactionIcon } from "@/components/icons/faction-icon";
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
import { selectConnectionsData } from "@/store/selectors/connections";
import {
  selectConnectionLock,
  selectConnectionLockForDeck,
} from "@/store/selectors/shared";
import type { Id } from "@/store/slices/data.types";
import { cx } from "@/utils/cx";
import { capitalize, formatTabooSet } from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import { useHotkey } from "@/utils/use-hotkey";
import {
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  ImportIcon,
  PencilIcon,
  ShareIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useLocation, useSearch } from "wouter";
import { useCardModalContextChecked } from "../card-modal/card-modal-context";
import { DeckInvestigatorModal } from "../deck-investigator/deck-investigator-modal";
import { CopyToClipboard } from "../ui/copy-to-clipboard";
import { useDialogContextChecked } from "../ui/dialog.hooks";
import { HotkeyTooltip } from "../ui/hotkey";
import { LatestUpgrade } from "./deck-history/latest-upgrade";
import {
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
  origin: DeckOrigin;
  deck: ResolvedDeck;
};

export function Sidebar(props: Props) {
  const { className, origin, deck } = props;

  const dialogContext = useDialogContextChecked();
  const cardModalContext = useCardModalContextChecked();

  const connectionsData = useStore(selectConnectionsData);

  const uploadDeck = useUploadDeck();
  const onUpload = useCallback(() => {
    uploadDeck(deck.id);
  }, [deck.id, uploadDeck]);

  useEffect(() => {
    if (cardModalContext.isOpen) {
      dialogContext?.setOpen(false);
    }
  }, [cardModalContext.isOpen, dialogContext.setOpen]);

  const isReadOnly = !!deck.next_deck;

  const canUploadToArkhamDb =
    origin === "local" &&
    !isReadOnly &&
    deck.source !== "arkhamdb" &&
    !isEmpty(connectionsData);

  const onArkhamDBUpload = canUploadToArkhamDb ? onUpload : undefined;

  return (
    <div className={cx(css["container"], className)}>
      <DeckInvestigator deck={deck} size="tooltip" titleLinks="dialog" />
      <DialogContent>
        <DeckInvestigatorModal
          deck={deck}
          onCloseModal={() => dialogContext?.setOpen(false)}
          readonly
        />
      </DialogContent>

      <SidebarActions
        onArkhamDBUpload={onArkhamDBUpload}
        deck={deck}
        origin={origin}
      />
      <SidebarDetails deck={deck} />
      {origin === "local" && <SidebarUpgrade deck={deck} />}

      {origin === "arkhamdb" ||
        (deck.source === "arkhamdb" && <ArkhamDbDetails deck={deck} />)}

      {origin === "local" && deck.source !== "arkhamdb" && (
        <Sharing onArkhamDBUpload={onArkhamDBUpload} deck={deck} />
      )}
    </div>
  );
}

function SidebarDetails(props: { deck: ResolvedDeck }) {
  const { deck } = props;
  const { t } = useTranslation();

  return (
    <ul className={css["details"]}>
      <li className={css["detail"]} data-testid="view-deck-size">
        <div className={css["detail-label"]}>
          <i className="icon-card-outline-bold" /> {t("deck.stats.deck_size")}
        </div>
        <p className={css["detail-value"]}>
          {deck.stats.deckSize} ({deck.stats.deckSizeTotal} {t("common.total")})
        </p>
      </li>

      <li className={css["detail"]} data-testid="view-deck-xp">
        <div className={css["detail-label"]}>
          <i className="icon-xp-bold" /> {t("deck.stats.xp_required")}
        </div>
        <p className={css["detail-value"]}>{deck.stats.xpRequired}</p>
      </li>

      <li className={css["detail"]} data-testid="view-deck-taboo">
        <div className={css["detail-label"]}>
          <i className="icon-taboo" /> {t("common.taboo")}
        </div>
        <p className={css["detail-value"]}>
          {deck.tabooSet ? (
            <span>{formatTabooSet(deck.tabooSet)}</span>
          ) : (
            t("common.taboo_none")
          )}
        </p>
      </li>

      {!!deck.selections &&
        Object.entries(deck.selections).map(([key, selection]) => (
          <li
            className={css["detail"]}
            key={key}
            data-testid={`selection-${key}`}
          >
            <div
              className={css["detail-label"]}
              data-testid={`selection-${key}-label`}
            >
              {t(`common.deck_options.${selection.name}`)}
            </div>
            {selection.type === "deckSize" && (
              <p
                className={css["detail-value"]}
                data-testid={`selection-${key}-value`}
              >
                {selection.value}
              </p>
            )}
            {selection.type === "faction" && (
              <p
                className={css["detail-value"]}
                data-testid={`selection-${key}-value`}
              >
                {selection.value ? (
                  <span className={css["detail-faction"]}>
                    <FactionIcon code={selection.value} />
                    {t(`common.factions.${selection.value}`)}
                  </span>
                ) : (
                  t("common.none")
                )}
              </p>
            )}
            {selection.type === "option" && (
              <p
                className={css["detail-value"]}
                data-testid={`selection-${key}-value`}
              >
                {t(`common.deck_options.${selection.value?.name}`)}
              </p>
            )}
          </li>
        ))}
    </ul>
  );
}

function SidebarUpgrade(props: { deck: ResolvedDeck }) {
  const { deck } = props;
  const { t } = useTranslation();

  if (!deck.previous_deck) return null;

  return (
    <section className={css["details"]} data-testid="view-latest-upgrade">
      <div className={cx(css["detail"], css["full"])}>
        <header>
          <h3 className={css["detail-label"]}>
            <i className="icon-upgrade" />
            {t("deck.latest_upgrade.title")}
          </h3>
        </header>
        <div className={css["detail-value"]}>
          <LatestUpgrade deck={deck} readonly />
        </div>
      </div>
    </section>
  );
}

function SidebarActions(props: {
  origin: DeckOrigin;
  deck: ResolvedDeck;
  onArkhamDBUpload?: () => void;
}) {
  const { origin, deck, onArkhamDBUpload } = props;

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
      history.replaceState(null, "", " ");
    }
  }, []);

  const onOpenUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(true);
  }, []);

  const onEdit = useCallback(() => {
    navigate(`/deck/edit/${deck.id}`);
  }, [deck.id, navigate]);

  const importSharedDeck = useStore((state) => state.importSharedDeck);

  const onImport = useCallback(async () => {
    try {
      const id = await importSharedDeck(deck);

      toast.show({
        children: t("deck_view.import_success"),
        variant: "success",
        duration: 3000,
      });

      navigate(`/deck/view/${id}`);
    } catch (err) {
      toast.show({
        children: t("deck_view.import_failed", {
          error: (err as Error).message,
        }),
        variant: "error",
      });
    }
  }, [deck, importSharedDeck, toast.show, navigate, t]);

  const isReadOnly = !!deck.next_deck;

  useHotkey("e", onEdit, { disabled: isReadOnly });
  useHotkey("u", onOpenUpgradeModal, { disabled: isReadOnly });
  useHotkey("cmd+backspace", onDelete, { disabled: isReadOnly });
  useHotkey("cmd+shift+backspace", onDeleteLatest, { disabled: isReadOnly });
  useHotkey("cmd+i", onImport, { disabled: origin === "local" });
  useHotkey("cmd+d", onDuplicate);
  useHotkey("cmd+shift+j", onExportJson);
  useHotkey("cmd+shift+t", onExportText);

  const nextDeck = isReadOnly
    ? `${origin !== "share" ? "/deck/view/" : "/share/"}${deck.next_deck}`
    : undefined;

  return (
    <>
      {nextDeck && (
        <Notice variant="info">
          <Trans
            t={t}
            i18nKey="deck_view.newer_version"
            components={{ a: <Link href={nextDeck} /> }}
          />
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
            <Button size="full" onClick={onImport}>
              <ImportIcon /> {t("deck_view.actions.import")}
            </Button>
          </HotkeyTooltip>
        )}
        <Popover
          placement="bottom-start"
          open={actionsOpen}
          onOpenChange={setActionsOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant="bare"
              data-testid="view-more-actions"
              tooltip={t("common.more_actions")}
            >
              <EllipsisIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <DropdownMenu>
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
                hotkey="cmd+shift+j"
                onClick={onExportJson}
              >
                <DownloadIcon /> {t("deck.actions.export_json")}
              </DropdownButton>
              <DropdownButton
                data-testid="view-export-text"
                hotkey="cmd+shift+t"
                onClick={onExportText}
              >
                <DownloadIcon /> {t("deck.actions.export_text")}
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

function Sharing(props: { onArkhamDBUpload?: () => void; deck: ResolvedDeck }) {
  const { deck, onArkhamDBUpload } = props;
  const toast = useToast();
  const { t } = useTranslation();

  const deckData = useStore((state) => state.data.decks[props.deck.id]);
  const share = useStore((state) => state.sharing.decks[props.deck.id]);

  const connectionLock = useStore(selectConnectionLock);

  const createShare = useStore((state) => state.createShare);
  const deleteShare = useStore((state) => state.deleteShare);
  const updateShare = useStore((state) => state.updateShare);

  async function withToast(fn: () => Promise<unknown>, action: string) {
    const id = toast.show({
      children: `${capitalize(action)} share...`,
      variant: "loading",
    });

    try {
      await fn();
      toast.dismiss(id);
      toast.show({
        children: `Share ${action} successful`,
        variant: "success",
        duration: 3000,
      });
    } catch (err) {
      toast.dismiss(id);
      toast.show({
        children: `Failed to ${action} share: ${(err as Error).message}`,
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
      <div className={cx(css["detail"], css["full"])}>
        <header>
          <h3 className={css["detail-label"]}>
            <ShareIcon />
            {t("deck_view.sharing.title")}
          </h3>
        </header>
        <div className={css["detail-value"]}>
          {share ? (
            <div className={css["share"]}>
              <ShareInfo id={deck.id} path={`/share/${deck.id}`} />
              <nav className={css["share-actions"]}>
                {deck.date_update !== share && (
                  <Button
                    disabled={isReadOnly}
                    onClick={onUpdateShare}
                    size="sm"
                  >
                    {t("deck_view.sharing.update")}
                  </Button>
                )}
                <Button size="sm" onClick={onDeleteShare}>
                  {t("deck_view.sharing.delete")}
                </Button>
              </nav>
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
        </div>
      </div>
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
function ArkhamDbDetails(props: { deck: ResolvedDeck }) {
  const { deck } = props;
  const { t } = useTranslation();

  return (
    <>
      <section className={css["details"]} data-testid="share">
        <div className={cx(css["detail"], css["full"])}>
          <header>
            <h3 className={css["detail-label"]}>
              <i className="icon-elder_sign" />
              ArkhamDB
            </h3>
          </header>
          <div className={css["detail-value"]}>
            <p>
              {t("deck_view.connections.description", { provider: "ArkhamDB" })}
            </p>
            <Button
              as="a"
              href={`${import.meta.env.VITE_ARKHAMDB_BASE_URL}/deck/view/${deck.id}`}
              size="sm"
              rel="noreferrer"
              target="_blank"
            >
              {t("deck_view.connections.view", { provider: "ArkhamDB" })}
            </Button>
          </div>
        </div>
      </section>
      <section className={css["details"]} data-testid="share">
        <div className={cx(css["detail"], css["full"])}>
          <header>
            <h3 className={css["detail-label"]}>
              <ShareIcon />
              {t("deck_view.sharing.title")}
            </h3>
          </header>
          <ShareInfo id={deck.id} path={`/deck/view/${deck.id}`} />
        </div>
      </section>
    </>
  );
}
