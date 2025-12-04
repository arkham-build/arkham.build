import { cx } from "@/utils/cx";
import css from "./footer.module.css";

type Props = {
  className?: string;
};

export function Footer(props: Props) {
  return (
    <div className={cx(css["footer"], props.className)}>
      <p>
        <a
          href="https://www.fantasyflightgames.com/en/products/arkham-horror-the-card-game/"
          rel="noreferrer"
          target="_blank"
          tabIndex={-1}
        >
          Arkham Horror: The Card Game™
        </a>{" "}
        and all related content &copy;{" "}
        <a
          href="https://www.fantasyflightgames.com"
          rel="noreferrer"
          target="_blank"
          tabIndex={-1}
        >
          Fantasy Flight Games (FFG)
        </a>
        . This site is not produced, endorsed by or affiliated with FFG.{" "}
      </p>
    </div>
  );
}
