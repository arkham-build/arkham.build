import type { SessionResponse } from "@arkham-build/shared";
import css from "./avatar.module.css";

type Props = {
  account: SessionResponse["account"];
};

export function Avatar({ account }: Props) {
  return (
    <div className={css["avatar"]}>
      {account.avatar ? (
        <img src={account.avatar} alt="avatar" />
      ) : (
        <div className={css["placeholder"]}>
          {account.name.charAt(0).toLocaleUpperCase()}
        </div>
      )}
    </div>
  );
}
