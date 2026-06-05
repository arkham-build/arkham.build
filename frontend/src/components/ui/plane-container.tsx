import { cx } from "@/utils/cx";
import { Plane } from "./plane";
import css from "./plane-container.module.css";

type Props = {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  size?: "sm";
  title?: React.ReactNode;
  titleAs?: React.ElementType;
} & Omit<React.HTMLAttributes<HTMLElement>, "title">;

export function PlaneContainer(props: Props) {
  const { as, children, className, size, title, titleAs, ...rest } = props;
  const Title = titleAs ?? "h3";

  return (
    <Plane
      {...rest}
      as={as}
      className={cx(css["container"], className)}
      size={size}
    >
      {title && <Title className={css["title"]}>{title}</Title>}
      {children}
    </Plane>
  );
}
