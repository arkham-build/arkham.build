import { cx } from "@/utils/cx";
import css from "./media-card.module.css";

type Props = {
  bannerAlt?: string;
  bannerUrl?: string;
  children: React.ReactNode;
  className?: string;
  title: React.ReactNode;
};

export function MediaCard(props: Props) {
  const { bannerAlt, bannerUrl, children, className, title } = props;

  return (
    <article className={cx(css["card"], className)}>
      <header className={css["header"]}>
        {bannerUrl && (
          <img
            alt={bannerAlt}
            className={css["backdrop"]}
            loading="lazy"
            src={bannerUrl}
          />
        )}
        <div className={css["title"]}>{title}</div>
      </header>
      <div className={css["content"]}>{children}</div>
    </article>
  );
}
