import { useEffect, useMemo } from "react";
import { inputFocused } from "./keyboard";

type Hotkey = {
  key: string;
  modifiers: string[];
};

type Options = {
  allowInputFocused?: boolean;
  disabled?: boolean;
};

export function useHotkey(
  hotkeyStr: string | undefined,
  callback?: () => void,
  options?: Options,
) {
  const hotkey = useMemo(() => parseHotkey(hotkeyStr), [hotkeyStr]);

  useEffect(() => {
    if (options?.disabled || !hotkey) return;

    function onKeyDown(evt: KeyboardEvent) {
      if (!options?.allowInputFocused && inputFocused()) return;

      if (hotkeyMatches(evt, hotkey)) {
        evt.preventDefault();
        callback?.();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [hotkey, callback, options?.disabled, options?.allowInputFocused]);
}

export function parseHotkey(hotkey: string | undefined): Hotkey | undefined {
  if (!hotkey) return undefined;

  const parts = hotkey.split("+");
  const key = parts.pop();
  const modifiers = parts;

  if (!key) return undefined;
  return { key, modifiers };
}

type Modifier = "ctrl" | "alt" | "shift" | "cmd";

const MODIFIERS: Modifier[] = ["ctrl", "alt", "shift", "cmd"] as const;

const MODIFIER_MAP: Record<Modifier, (evt: KeyboardEvent) => boolean> = {
  ctrl: (evt: KeyboardEvent) => evt.ctrlKey,
  alt: (evt: KeyboardEvent) => evt.altKey,
  shift: (evt: KeyboardEvent) => evt.shiftKey,
  cmd: (evt: KeyboardEvent) => evt.metaKey || evt.ctrlKey,
};

function hotkeyMatches(
  evt: KeyboardEvent,
  hotkey: Hotkey | undefined,
): boolean {
  if (!hotkey) return false;

  // When alt is pressed, we check the physical key pressed rather than the composed value
  // due to it being used to produce special characters.
  // The approach here only work for alphabetic keys, special keys like `Enter` or `ArrowUp` will not work.
  const matches = evt.altKey
    ? evt.code === keyToCode(hotkey.key)
    : evt.key.toLowerCase() === hotkey.key;

  if (!matches) return false;

  const cmd = hotkey.modifiers.includes("cmd");

  return MODIFIERS.every((mod) => {
    // If shift is pressed, we only check when it's part of the hotkey.
    // This makes special character hotkeys such as `?` work.
    if (mod === "shift" && evt.shiftKey && hotkey.modifiers.length === 0) {
      return true;
    }

    if (cmd && mod === "ctrl") {
      return MODIFIER_MAP["cmd"](evt);
    }

    const actual = MODIFIER_MAP[mod](evt);
    const expected = hotkey.modifiers.includes(mod);

    return actual === expected;
  });
}

function keyToCode(key: string): string {
  if (/[a-zA-z]/.test(key)) {
    return `Key${key.toUpperCase()}`;
  }

  if (/^\d+$/.test(key)) {
    return `Digit${key}`;
  }

  return key;
}
