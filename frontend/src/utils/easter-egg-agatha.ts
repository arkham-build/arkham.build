import { useCallback, useEffect } from "react";
import { useStore } from "@/store";

const AGATHA_TRIGGER = "agathaallalong";
const AGATHA_CODES = ["11007", "11008", "11007b", "11008b"];
const AGATHA_FLAG = "easter_egg_agatha";

const _MONTEREY_CODES = ["08007", "08007b"];
const _MONTEREY_FLAG = "easter_egg_monty";

export function useAgathaEasterEggTrigger() {
  const toggleFlag = useStore((state) => state.toggleFlag);
  const flag = useStore((state) => !!state.settings.flags?.[AGATHA_FLAG]);

  const callback = useCallback(
    (val: string) => {
      const match = val === AGATHA_TRIGGER;

      if (match) {
        const confirmed = flag
          ? true
          : confirm(
              "You are about to transform Agatha into her true self. If you ever want to return her to her original form, cast this incantation again.",
            );

        if (confirmed) toggleFlag(AGATHA_FLAG).catch(console.error);
      }

      return match;
    },
    [toggleFlag, flag],
  );

  return callback;
}

export function useAgathaEasterEggTransform(code: string) {
  const flag = useStore((state) => !!state.settings.flags?.[AGATHA_FLAG]);
  if (!AGATHA_CODES.includes(code)) return code;
  return flag ? `${AGATHA_FLAG}_${code}` : code;
}

export function useAgathaEasterEggHint() {
  const settings = useStore((state) => state.settings);

  useEffect(() => {
    const flag = settings.flags?.[AGATHA_FLAG];

    const action = flag
      ? "transform Agatha back into her original form"
      : "reveal Agatha's true form";

    // biome-ignore lint/suspicious/noConsole: easter egg
    console.log(
      `%c🦹🏻‍♀️ If you want to ${action}, paste \`agathaallalong\` in the card search. 🦹🏻‍♀️`,
      "color: rebeccapurple; background-color: #eee",
    );
  }, [settings]);
}

function _aprilFools() {
  const date = new Date();
  return date.getMonth() === 3 && date.getDate() === 1;
}
