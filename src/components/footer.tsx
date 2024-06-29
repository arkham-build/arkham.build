import { Link } from "wouter";

import css from "./footer.module.css";

export function Footer() {
  return (
    <div className={css["footer"]}>
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
        <Link href="/about" tabIndex={-1}>
          About.
        </Link>
      </p>
    </div>
  );
}
