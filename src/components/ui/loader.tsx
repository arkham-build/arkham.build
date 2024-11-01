import { cx } from "@/utils/cx";
import { useEffect, useState } from "react";
import css from "./loader.module.css";

type Props = {
  message?: string;
  show?: boolean;
  delay?: number;
};

export function Loader(props: Props) {
  const { delay, message, show } = props;

  const [visible, setVisible] = useState(!delay);

  useEffect(() => {
    if (delay) {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!visible) return null;

  return (
    <div className={cx(css["loader"], show && css["show"])}>
      <div className={css["loader-inner"]}>
        <div className={css["loader-icon"]}>
          <i className="icon-auto_fail" />
          <i className="icon-elder_sign" />
        </div>
        <div className={css["loader-message"]}>
          {message && <p>{message}</p>}
        </div>
      </div>
    </div>
  );
}
