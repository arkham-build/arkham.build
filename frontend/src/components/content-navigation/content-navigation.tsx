import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { DefaultTooltip } from "@/components/ui/tooltip";
import { cx } from "@/utils/cx";
import css from "./content-navigation.module.css";

export type ContentNavigationTarget = {
  href: string;
  icon: React.ReactNode;
  name: string;
};

type Props = {
  next?: ContentNavigationTarget;
  previous?: ContentNavigationTarget;
};

export function ContentNavigation({ next, previous }: Props) {
  return (
    <nav className={css["navigation"]}>
      <NavigationLink direction="previous" target={previous} />
      <NavigationLink direction="next" target={next} />
    </nav>
  );
}

function NavigationLink({
  direction,
  target,
}: {
  direction: "next" | "previous";
  target?: ContentNavigationTarget;
}) {
  const { t } = useTranslation();
  const previous = direction === "previous";
  const Icon = previous ? ChevronLeftIcon : ChevronRightIcon;

  if (!target) {
    return (
      <span aria-hidden className={cx(css["link"], css["disabled"])}>
        <Icon />
      </span>
    );
  }

  const directionLabel = previous
    ? t("ui.pagination.previous")
    : t("ui.pagination.next");
  const label = `${directionLabel}: ${target.name}`;

  return (
    <DefaultTooltip tooltip={label}>
      <Link aria-label={label} className={css["link"]} href={target.href}>
        {previous && <Icon />}
        <span aria-hidden className={css["icon"]}>
          {target.icon}
        </span>
        {!previous && <Icon />}
      </Link>
    </DefaultTooltip>
  );
}
