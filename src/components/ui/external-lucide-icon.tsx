import { cx } from "@/utils/cx";

type Props = {
  className?: string;
  url: string;
};

export function ExternalLucideIcon(props: Props) {
  const { className, url } = props;

  const src = url.startsWith("lucide://")
    ? `/lucide/icons/${url.replace("lucide://", "")}.svg`
    : url;

  return (
    <span className={cx("external-svg-icon", className)}>
      <span
        style={
          {
            "--svg-url": `url(${src})`,
          } as React.CSSProperties
        }
        className="external-svg-icon-icon"
        aria-hidden="true"
      />
    </span>
  );
}
