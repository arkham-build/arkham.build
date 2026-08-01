import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { Button } from "./button";
import css from "./password-input.module.css";

type Props = Omit<React.ComponentProps<"input">, "type">;

export function PasswordInput(props: Props) {
  const { className, disabled, ...rest } = props;
  const { t } = useTranslation();
  const [passwordVisible, setPasswordVisible] = useState(false);

  function togglePasswordVisibility() {
    setPasswordVisible((visible) => !visible);
  }

  return (
    <div className={css["container"]}>
      <input
        {...rest}
        className={cx(css["input"], className)}
        disabled={disabled}
        type={passwordVisible ? "text" : "password"}
      />
      <Button
        aria-label={t(
          passwordVisible
            ? "ui.password_input.hide_password"
            : "ui.password_input.show_password",
        )}
        className={css["toggle"]}
        disabled={disabled}
        iconOnly
        onClick={togglePasswordVisibility}
        size="xs"
        variant="bare"
      >
        {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
    </div>
  );
}
