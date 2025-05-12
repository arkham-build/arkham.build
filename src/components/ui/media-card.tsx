import { cx } from "@/utils/cx";
import css from "./media-card.module.css";

type Props = {
  bannerAlt?: string;
  bannerUrl?: string;
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  classNames?: {
    container?: string;
    header?: string;
    content?: string;
    footer?: string;
  };
  title: React.ReactNode;
};

export function MediaCard(props: Props) {
  const {
    bannerAlt,
    bannerUrl,
    children,
    classNames,
    footerSlot,
    headerSlot,
    title,
  } = props;

  return (
    <article className={cx(css["card"], classNames?.container)}>
      <header className={cx(css["header"], classNames?.header)}>
        {bannerUrl && (
          <img
            alt={bannerAlt}
            className={css["backdrop"]}
            loading="lazy"
            src={bannerUrl}
          />
        )}
        <div className={css["title"]}>{title}</div>
        {headerSlot}
      </header>
      <div className={cx(css["content"], classNames?.content)}>{children}</div>
      {footerSlot && (
        <footer className={classNames?.footer}>{footerSlot}</footer>
      )}
    </article>
  );
}
