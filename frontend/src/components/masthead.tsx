import { SettingsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { cx } from "@/utils/cx";
import { HelpMenu } from "./help-menu";
import { Logo } from "./icons/logo";
import { LocaleQuickSwitch } from "./locale-quick-switch";
import css from "./masthead.module.css";
import { SyncStatus } from "./sync-status";
import { Button } from "./ui/button";

type Props = {
  className?: string;
  children?: React.ReactNode;
  slotRight?: React.ReactNode;
  hideSyncStatus?: boolean;
  hideLocaleSwitch?: boolean;
  hideSettings?: boolean;
  invert?: boolean;
};

export function Masthead(props: Props) {
  const {
    children,
    className,
    hideLocaleSwitch,
    hideSettings,
    hideSyncStatus,
    invert,
    slotRight,
  } = props;

  const { t } = useTranslation();

  const [location] = useLocation();

  return (
    <header
      className={cx(className, css["masthead"], invert && css["invert"])}
      id="masthead"
    >
      <div className={css["left"]}>
        <Link className={css["logo"]} href="~/" data-testid="masthead-logo">
          <Logo />
          <span className={css["logo-name"]}>
            {import.meta.env.VITE_PAGE_NAME}
          </span>
        </Link>
        {children}
      </div>
      <nav className={css["right"]}>
        {slotRight}
        {location !== "/settings" && (
          <>
            {!hideSyncStatus && <SyncStatus />}
            {!hideLocaleSwitch && <LocaleQuickSwitch />}
            {!hideSettings && (
              <Link asChild href="~/settings">
                <Button
                  as="a"
                  className={css["settings"]}
                  data-testid="masthead-settings"
                  iconOnly
                  size="lg"
                  tooltip={t("settings.title")}
                  variant="bare"
                >
                  <SettingsIcon />
                </Button>
              </Link>
            )}
          </>
        )}
        <HelpMenu />
      </nav>
    </header>
  );
}
