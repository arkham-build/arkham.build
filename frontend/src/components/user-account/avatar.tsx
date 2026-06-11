import type { SessionResponse } from "@arkham-build/shared";
import css from "./avatar.module.css";

type Props = {
  account: SessionResponse["account"];
  children?: React.ReactNode;
};

export function Avatar({ account, children }: Props) {
  return (
    <div className={css["avatar"]}>
      <div className={css["placeholder"]}>
        {account.name.charAt(0).toLocaleUpperCase()}
      </div>
      {children}
    </div>
  );
}
