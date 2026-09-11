import { ChevronRightIcon } from "lucide-react";
import { Link } from "wouter";
import { cx } from "@/utils/cx";
import css from "./breadcrumb.module.css";

type BreadcrumbItem = {
  current?: boolean;
  href?: string;
  icon?: React.ReactNode;
  label: string;
};

type Props = React.ComponentProps<"nav"> & {
  items: readonly BreadcrumbItem[];
};

export function Breadcrumb({ className, items, ...rest }: Props) {
  return (
    <nav {...rest} className={cx(css["breadcrumb"], className)}>
      <ol className={css["list"]}>
        {items.map((item, index) => {
          return (
            <li
              className={css["item"]}
              key={`${item.href ?? ""}-${item.label}`}
            >
              {index > 0 && (
                <ChevronRightIcon aria-hidden className={css["separator"]} />
              )}
              {item.href ? (
                <Link
                  aria-current={item.current ? "page" : undefined}
                  className={css["link"]}
                  href={item.href}
                >
                  <BreadcrumbItemContent item={item} />
                </Link>
              ) : (
                <span
                  aria-current={item.current ? "page" : undefined}
                  className={css["value"]}
                >
                  <BreadcrumbItemContent item={item} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function BreadcrumbItemContent({ item }: { item: BreadcrumbItem }) {
  return (
    <>
      {item.icon && (
        <span aria-hidden className={css["icon"]}>
          {item.icon}
        </span>
      )}
      <span>{item.label}</span>
    </>
  );
}
