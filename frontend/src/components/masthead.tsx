import {
  KeyboardIcon,
  LogOutIcon,
  MenuIcon,
  RefreshCwIcon,
  SettingsIcon,
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
import { cx } from "@/utils/cx";
import { Logo } from "./icons/logo";
import { LocaleQuickSwitch } from "./locale-quick-switch";
import css from "./masthead.module.css";
import { Button } from "./ui/button";
import { DropdownButton, DropdownItem, DropdownMenu } from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useToast } from "./ui/toast.hooks";
import { Avatar } from "./user-account/avatar";

type Props = {
  className?: string;
  children?: React.ReactNode;
  slotRight?: React.ReactNode;
  hideLocaleSwitch?: boolean;
  hideSettings?: boolean;
  invert?: boolean;
};

export function Masthead(props: Props) {
  const { children, className, hideLocaleSwitch, invert, slotRight } = props;

  const { t } = useTranslation();

  const [location] = useLocation();

  const session = useStore(selectSession);

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
        {children}
      </div>
      <nav className={css["right"]}>
        {slotRight}
        {!location.includes("/auth") && (
          <>
            {!session && (
              <Link asChild href="~/auth/login">
                <Button as="a" size="sm" variant="primary">
                  {t("auth.login.title")}
                </Button>
              </Link>
            )}
            {!hideLocaleSwitch && <LocaleQuickSwitch />}
            <AccountMenu />
          </>
        )}
      </nav>
    </header>
  );
}

function AccountMenu() {
  const { t } = useTranslation();
  const session = useStore(selectSession);
  const toggleKeyboardShortcuts = useStore(
    (state) => state.toggleKeyboardShortcuts,
  );

  const { isPending: isSyncPending, onSyncAccount } = useAccountSyncAction();
  const logoutMutation = useLogoutMutation();

  const actionNodes = (
    <>
      <Link asChild href="~/settings">
        <DropdownButton
          as="a"
          data-testid="masthead-settings"
          tooltip={t("settings.title")}
          variant="bare"
        >
          <SettingsIcon /> {t("settings.title")}
        </DropdownButton>
      </Link>
      {session && (
        <DropdownButton
          data-testid="masthead-account-sync"
          disabled={isSyncPending || logoutMutation.isPending}
          onClick={onSyncAccount}
        >
          <RefreshCwIcon />
          {t("auth.menu.sync_account")}
        </DropdownButton>
      )}
      <hr />
      <DropdownButton
        className={css["action-shortcuts"]}
        hotkey="?"
        onClick={toggleKeyboardShortcuts}
      >
        <KeyboardIcon /> {t("help.shortcuts.title")}
      </DropdownButton>
      <Link asChild href="~/about">
        <DropdownButton
          as="a"
          className={css["about"]}
          data-testid="masthead-about"
        >
          {t("help.about")}
        </DropdownButton>
      </Link>
    </>
  );

  return (
    <Popover>
      {session ? (
        <PopoverTrigger asChild>
          <Button variant="bare" iconOnly size="none">
            <Avatar account={session.account} />
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
          {session && (
            <DropdownItem>
              <p className={css["logged-in-as"]}>
                {t("auth.menu.logged_in_as", {
                  name: session.account.name,
                })}
              </p>
            </DropdownItem>
          )}
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
