import { cx } from "@/utils/cx";
import css from "./media-card.module.css";

type Banner = {
  alt: string;
  src: string;
  constraints?: {
    position?: React.CSSProperties["objectPosition"];
  };
};

type Props = {
  banner?: Banner;
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
  const { banner, children, classNames, footerSlot, headerSlot, title } = props;

  return (
    <article className={cx(css["card"], classNames?.container)}>
      <header className={cx(css["header"], classNames?.header)}>
        {banner && (
          <img
            alt={banner.alt}
            className={css["backdrop"]}
            loading="lazy"
            src={banner.src}
            style={{
              objectPosition: banner.constraints?.position ?? "auto",
            }}
          />
        )}
        <div className={cx("blurred-background", css["title"])}>{title}</div>
        {headerSlot}
      </header>
      <div className={classNames?.content}>{children}</div>
      {footerSlot && (
        <footer className={classNames?.footer}>{footerSlot}</footer>
      )}
    </article>
  );
}
