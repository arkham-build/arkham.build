import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { injectScript } from "@/utils/inject-script";
import { useResolvedColorTheme } from "@/utils/use-color-theme";
import { ErrorBox } from "./error-box";
import css from "./turnstile.module.css";

type Props = {
  onChange: (token: string | null) => void;
  siteKey: string;
};

type TurnstileApi = {
  remove: (widgetId: string) => void;
  render: (
    container: HTMLElement,
    options: {
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      sitekey: string;
      size?: string;
      theme?: string;
      appearance?: string;
    },
  ) => string;
};

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function Turnstile(props: Props) {
  const { onChange, siteKey } = props;
  const { t } = useTranslation();
  const theme = useResolvedColorTheme();

  const [loadFailed, setLoadFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    onChange(null);
    setLoadFailed(false);

    async function init() {
      try {
        await loadTurnstileScript();
        const container = containerRef.current;
        if (cancelled || !container) return;

        const turnstile = getTurnstileApi();

        widgetIdRef.current = turnstile.render(container, {
          appearance: "always",
          size: "flexible",
          theme: theme === "dark" ? "dark" : "light",
          sitekey: siteKey,
          callback: (token) => {
            onChange(token);
          },
          "expired-callback": () => {
            onChange(null);
          },
          "error-callback": () => {
            onChange(null);
          },
        });
      } catch {
        if (cancelled) return;
        onChange(null);
        setLoadFailed(true);
      }
    }

    void init();

    return () => {
      cancelled = true;
      if (!widgetIdRef.current) return;

      getTurnstileApi().remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [onChange, siteKey, theme]);

  return (
    <>
      {loadFailed ? (
        <ErrorBox>{t("auth.errors.captcha_load_failed")}</ErrorBox>
      ) : (
        <div className={cx(css["widget"])} ref={containerRef} />
      )}
    </>
  );
}

function getTurnstileApi() {
  const turnstile = (
    globalThis as typeof globalThis & {
      turnstile?: TurnstileApi;
    }
  ).turnstile;

  if (!turnstile) {
    throw new Error("Turnstile is not available.");
  }

  return turnstile;
}

function loadTurnstileScript() {
  if (getGlobalTurnstileApi()) return Promise.resolve();
  return injectScript(TURNSTILE_SCRIPT_SRC);
}

function getGlobalTurnstileApi() {
  return (
    globalThis as typeof globalThis & {
      turnstile?: TurnstileApi;
    }
  ).turnstile;
}
