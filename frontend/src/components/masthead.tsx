import {
  BookOpenTextIcon,
  BookTextIcon,
  KeyboardIcon,
  LogOutIcon,
  MenuIcon,
  RefreshCwIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import {
  useAccountSyncMutation,
  useLogoutMutation,
} from "@/queries/mutations/auth";
import { useStore } from "@/store";
import { selectSession } from "@/store/selectors/auth";
import type { SyncStatus } from "@/store/slices/sync.types";
import { cx } from "@/utils/cx";
import { useMedia } from "@/utils/use-media";
import { Logo } from "./icons/logo";
import { LocaleQuickSwitch } from "./locale-quick-switch";
import css from "./masthead.module.css";
import { Button } from "./ui/button";
import { DropdownButton, DropdownItem, DropdownMenu } from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { StatusBubble } from "./ui/status-bubble";
import { useToast } from "./ui/toast.hooks";
import { Avatar } from "./user-account/avatar";

type Props = {
  className?: string;
  children?: React.ReactNode;
  slotRight?: React.ReactNode;
  hideLocaleSwitch?: boolean;
  invert?: boolean;
};

type MastheadSection = "browse" | "decklists" | "rules" | "settings";

export function Masthead(props: Props) {
  const { children, className, hideLocaleSwitch, invert, slotRight } = props;

  const { t } = useTranslation();

  const [location] = useLocation();

  const session = useStore(selectSession);
  const collapseNav = useMedia("(max-width: 52rem)");
  const isAuthPage =
    location.startsWith("/auth") || location.includes("/account-migration");

  return (
    <header
      className={cx(className, css["masthead"], invert && css["invert"])}
      id="masthead"
    >
      <div className={css["left"]}>
        <Link className={css["logo"]} href="~/" data-testid="masthead-logo">
          <Logo />
          <span className="sr-only">{import.meta.env.VITE_PAGE_NAME}</span>
        </Link>
        {!collapseNav && !isAuthPage && <MastheadNav location={location} />}
        {children}
      </div>
      <nav className={css["right"]}>
        {slotRight}
        {!isAuthPage && (
          <>
            {!session && (
              <Link asChild href="~/auth/login">
                <Button as="a" size="sm" variant="primary">
                  {t("auth.login.title")}
                </Button>
              </Link>
            )}
            <NavLink
              className={css["icon-link"]}
              href="~/settings"
              iconOnly
              location={location}
              section="settings"
              testId="masthead-settings"
              tooltip={t("settings.title")}
            >
              <SettingsIcon />
            </NavLink>
            <AccountMenu
              collapseNav={collapseNav}
              hideLocaleSwitch={hideLocaleSwitch}
              location={location}
            />
          </>
        )}
      </nav>
    </header>
  );
}

function MastheadNav(props: { location: string }) {
  const { location } = props;
  const { t } = useTranslation();

  return (
    <nav className={css["nav"]} aria-label={t("masthead.navigation")}>
      <NavLink
        className={css["nav-link"]}
        href="~/browse"
        location={location}
        section="browse"
        testId="masthead-browse"
      >
        <i className="icon-card-outline-bold" />
        {t("masthead.browse")}
      </NavLink>
      <NavLink
        className={css["nav-link"]}
        href="~/decklists"
        location={location}
        section="decklists"
        testId="masthead-deck-guides"
      >
        <BookTextIcon />
        {t("decklists.browse.title")}
      </NavLink>
      <NavLink
        className={css["nav-link"]}
        href="~/rules"
        location={location}
        section="rules"
        testId="masthead-rules"
      >
        <BookOpenTextIcon />
        {t("masthead.rules")}
      </NavLink>
    </nav>
  );
}

function NavLink(props: {
  children: React.ReactNode;
  className?: string;
  href: string;
  iconOnly?: boolean;
  location: string;
  section: MastheadSection;
  testId: string;
  tooltip?: React.ReactNode;
}) {
  const {
    children,
    className,
    href,
    iconOnly,
    location,
    section,
    testId,
    tooltip,
  } = props;
  const active = isMastheadPathActive(location, section);

  return (
    <Link asChild href={href}>
      <Button
        as="a"
        aria-current={active ? "page" : undefined}
        className={cx(className, active && css["active"])}
        data-testid={testId}
        iconOnly={iconOnly}
        size={iconOnly ? undefined : "sm"}
        tooltip={tooltip}
        variant="bare"
      >
        {children}
      </Button>
    </Link>
  );
}

function NavDropdownLink(props: {
  children: React.ReactNode;
  href: string;
  location: string;
  section: MastheadSection;
  testId: string;
}) {
  const { children, href, location, section, testId } = props;
  const active = isMastheadPathActive(location, section);

  return (
    <Link asChild href={href}>
      <DropdownButton
        as="a"
        aria-current={active ? "page" : undefined}
        className={active ? css["menu-link-active"] : undefined}
        data-testid={testId}
      >
        {children}
      </DropdownButton>
    </Link>
  );
}

function AccountMenu(props: {
  collapseNav: boolean;
  hideLocaleSwitch?: boolean;
  location: string;
}) {
  const { collapseNav, hideLocaleSwitch, location } = props;
  const { t } = useTranslation();
  const session = useStore(selectSession);
  const toggleKeyboardShortcuts = useStore(
    (state) => state.toggleKeyboardShortcuts,
  );
  const syncStatus = useAccountSyncStatus();

  const { isPending: isSyncPending, onSyncAccount } = useAccountSyncAction();

  const displayedSyncStatus: SyncStatus = isSyncPending
    ? "loading"
    : syncStatus;

  const logoutMutation = useLogoutMutation();

  const actionNodes = (
    <>
      {!hideLocaleSwitch && (
        <>
          <DropdownItem>
            <LocaleQuickSwitch fullWidth portal={false} />
          </DropdownItem>
          <hr />
        </>
      )}
      {session && (
        <>
          <DropdownItem>
            <p className={css["logged-in-as"]}>
              {t("auth.menu.logged_in_as", {
                name: session.account.name,
              })}
            </p>
          </DropdownItem>
          <Link asChild href="~/settings?tab=account">
            <DropdownButton as="a" data-testid="masthead-account">
              <UserIcon />
              {t("settings.account.title")}
            </DropdownButton>
          </Link>
          <DropdownButton
            data-testid="masthead-account-sync"
            disabled={isSyncPending || logoutMutation.isPending}
            onClick={onSyncAccount}
          >
            <RefreshCwIcon />
            {t("auth.menu.sync_account")}
          </DropdownButton>
          {isProblemSyncStatus(displayedSyncStatus) && (
            <DropdownItem>
              <p className={css["sync-status"]}>
                {t(`auth.menu.sync_status.${displayedSyncStatus}`)}
              </p>
            </DropdownItem>
          )}
          <hr />
        </>
      )}
      {collapseNav && (
        <>
          <NavDropdownLink
            href="~/browse"
            location={location}
            section="browse"
            testId="masthead-browse"
          >
            <i className="icon-card-outline-bold" />
            {t("masthead.browse")}
          </NavDropdownLink>
          <NavDropdownLink
            href="~/decklists"
            location={location}
            section="decklists"
            testId="masthead-deck-guides"
          >
            <BookTextIcon />
            {t("decklists.browse.title")}
          </NavDropdownLink>
          <NavDropdownLink
            href="~/rules"
            location={location}
            section="rules"
            testId="masthead-rules"
          >
            <BookOpenTextIcon />
            {t("masthead.rules")}
          </NavDropdownLink>
          <hr />
        </>
      )}
      <DropdownButton
        className={css["action-shortcuts"]}
        hotkey="?"
        onClick={toggleKeyboardShortcuts}
      >
        <KeyboardIcon /> {t("help.shortcuts.title")}
      </DropdownButton>
      <hr />
      <Link asChild href="~/about">
        <DropdownButton
          as="a"
          className={css["about"]}
          data-testid="masthead-about"
        >
          {t("help.about")}
        </DropdownButton>
      </Link>
      <Link asChild href="~/terms">
        <DropdownButton as="a" data-testid="masthead-terms">
          {t("footer.terms")}
        </DropdownButton>
      </Link>
      <Link asChild href="~/privacy">
        <DropdownButton as="a" data-testid="masthead-privacy">
          {t("footer.privacy")}
        </DropdownButton>
      </Link>
      <Link asChild href="~/legal-notice">
        <DropdownButton as="a" data-testid="masthead-legal-notice">
          {t("footer.legal_notice")}
        </DropdownButton>
      </Link>
    </>
  );

  return (
    <Popover>
      {session ? (
        <PopoverTrigger asChild>
          <Button
            data-testid="masthead-account-menu"
            variant="bare"
            iconOnly
            size="none"
          >
            <Avatar account={session.account}>
              <StatusBubble
                data-sync-status={displayedSyncStatus}
                data-testid="masthead-account-sync-status"
                variant={syncStatusToBubbleVariant(displayedSyncStatus)}
              />
            </Avatar>
          </Button>
        </PopoverTrigger>
      ) : (
        <PopoverTrigger asChild>
          <Button variant="bare" iconOnly>
            <MenuIcon />
          </Button>
        </PopoverTrigger>
      )}
      <PopoverContent>
        <DropdownMenu>
          {actionNodes}
          {session && (
            <>
              <hr />
              <DropdownButton
                disabled={logoutMutation.isPending}
                onClick={() => logoutMutation.mutate()}
              >
                <LogOutIcon />
                {t("auth.logout")}
              </DropdownButton>
            </>
          )}
        </DropdownMenu>
      </PopoverContent>
    </Popover>
  );
}

function isMastheadPathActive(
  location: string,
  section: "browse" | "decklists" | "rules" | "settings",
) {
  switch (section) {
    case "browse":
      return location.startsWith("/browse");
    case "decklists":
      return location.startsWith("/decklists");
    case "rules":
      return location.startsWith("/rules");
    case "settings":
      return location.startsWith("/settings");
  }
}

function useAccountSyncStatus(): SyncStatus {
  const settings = useStore((state) => state.sync.settings.status);
  const decks = useStore((state) => state.sync.decks.status);
  const folders = useStore((state) => state.sync.folders.status);

  return [settings, decks, folders].reduce((current, next) =>
    ACCOUNT_SYNC_STATUS_PRIORITY[next] > ACCOUNT_SYNC_STATUS_PRIORITY[current]
      ? next
      : current,
  );
}

function isProblemSyncStatus(status: SyncStatus) {
  return status === "conflict" || status === "error" || status === "partial";
}

function syncStatusToBubbleVariant(
  status: SyncStatus,
): React.ComponentProps<typeof StatusBubble>["variant"] {
  switch (status) {
    case "conflict":
    case "partial":
      return "warning";
    case "error":
      return "error";
    case "loading":
    case "saving":
      return "loading";
    case "idle":
    case "synced":
      return "success";
  }
}

const ACCOUNT_SYNC_STATUS_PRIORITY: Record<SyncStatus, number> = {
  idle: 0,
  synced: 0,
  loading: 1,
  saving: 1,
  partial: 2,
  error: 3,
  conflict: 4,
};

function useAccountSyncAction() {
  const { t } = useTranslation();
  const toast = useToast();
  const accountSyncMutation = useAccountSyncMutation();

  const onSyncAccount = useCallback(async () => {
    const toastId = toast.show({
      children: t("auth.menu.syncing"),
      variant: "loading",
    });

    try {
      await accountSyncMutation.mutateAsync();
      toast.dismiss(toastId);
    } catch (err) {
      toast.dismiss(toastId);
      console.error(err);
      toast.show({
        children: t("auth.menu.sync_error", { error: (err as Error).message }),
        variant: "error",
      });
    }
  }, [accountSyncMutation, t, toast]);

  return {
    isPending: accountSyncMutation.isPending,
    onSyncAccount,
  };
}
