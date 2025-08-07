import { cx } from "@/utils/cx";
import { useResolvedColorTheme } from "@/utils/use-color-theme";
import css from "./error-display.module.css";

type Props = {
  children?: React.ReactNode;
  message: string;
  pre?: React.ReactNode;
  status: number;
};

export function ErrorDisplay(props: Props) {
  return (
    <article className={css["error"]}>
      {props.pre}
      <div className={css["error-row"]}>
        <header className={css["error-header"]}>
          <h1 className={css["error-status"]}>{props.status}</h1>
          <h2 className={css["error-message"]}>{props.message}</h2>
        </header>
        {props.children}
      </div>
    </article>
  );
}

export function ErrorImage({ className }: { className?: string }) {
  const theme = useResolvedColorTheme();

  return (
    <img
      className={cx(className, css["error-image"])}
      src={theme === "dark" ? "/404-dark.png" : "/404-light.png"}
      alt="Stylized illustration of the False Lead card"
    />
  );
}
