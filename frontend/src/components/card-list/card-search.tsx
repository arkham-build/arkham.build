import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectActiveListSearch } from "@/store/selectors/lists";
import { assert } from "@/utils/assert";
import { cx } from "@/utils/cx";
import { debounce } from "@/utils/debounce";
import { useAgathaEasterEggTrigger } from "@/utils/easter-egg-agatha";
import { useHotkey } from "@/utils/use-hotkey";
import { useResolvedDeck } from "../resolved-deck-context";
import { Checkbox } from "../ui/checkbox";
import { ErrorBubble } from "../ui/error-bubble";
import { SearchInput } from "../ui/search-input";
import { Tag } from "../ui/tag";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./card-search.module.css";

type Props = {
  onInputKeyDown?: (evt: React.KeyboardEvent) => void;
  mode?: "force-hover" | "dynamic";
  slotLeft?: React.ReactNode;
  slotRight?: React.ReactNode;
  slotFlags?: React.ReactNode;
};

export function CardSearch(props: Props) {
  const {
    onInputKeyDown,
    mode = "dynamic",
    slotFlags,
    slotLeft,
    slotRight,
  } = props;

  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const iconSlotRef = useRef<HTMLDivElement>(null);

  const setSearchValue = useStore((state) => state.setSearchValue);
  const setSearchFlag = useStore((state) => state.setSearchFlag);

  const { resolvedDeck } = useResolvedDeck();

  const search = useStore(selectActiveListSearch);
  assert(search, "Search bar requires an active list.");

  const easterEggHandler = useAgathaEasterEggTrigger();

  const [inputValue, setInputValue] = useState(search.value ?? "");
  const [iconSlotSize, setIconSlotSize] = useState(0);

  useEffect(() => {
    const updateIconSlotSize = () => {
      if (iconSlotRef.current) {
        setIconSlotSize(iconSlotRef.current.getBoundingClientRect().width);
      }
    };

    updateIconSlotSize();

    window.addEventListener("resize", updateIconSlotSize, { passive: true });
    return () => window.removeEventListener("resize", updateIconSlotSize);
  }, []);

  const onShortcut = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useHotkey("/", onShortcut);

  const debouncedSetSearchValue = useMemo(
    () => debounce(setSearchValue, 50),
    [setSearchValue],
  );

  const onValueChange = useCallback(
    (val: string) => {
      setInputValue(val);
      debouncedSetSearchValue(val, resolvedDeck);
      if (easterEggHandler(val)) {
        setInputValue("");
        debouncedSetSearchValue("", resolvedDeck);
      }
    },
    [debouncedSetSearchValue, easterEggHandler, resolvedDeck],
  );

  const onToggleGameText = useCallback(
    (val: boolean | string) => {
      setSearchFlag("includeGameText", !!val, resolvedDeck);
      inputRef.current?.focus();
    },
    [setSearchFlag, resolvedDeck],
  );

  const onToggleFlavor = useCallback(
    (val: boolean | string) => {
      setSearchFlag("includeFlavor", !!val, resolvedDeck);
      inputRef.current?.focus();
    },
    [setSearchFlag, resolvedDeck],
  );

  const onToggleBacks = useCallback(
    (val: boolean | string) => {
      setSearchFlag("includeBacks", !!val, resolvedDeck);
      inputRef.current?.focus();
    },
    [setSearchFlag, resolvedDeck],
  );

  const onToggleCardName = useCallback(
    (val: boolean | string) => {
      setSearchFlag("includeName", !!val, resolvedDeck);
      inputRef.current?.focus();
    },
    [setSearchFlag, resolvedDeck],
  );

  const iconSlotNode = (
    <DefaultTooltip
      tooltip={search.buildQlError?.message}
      options={{ paused: !search.buildQlError }}
    >
      <a
        className={cx(
          css["buildql-tag"],
          search.mode === "buildql" && css["active"],
        )}
        href="https://github.com/arkham-build/arkham.build/blob/main/frontend/src/store/lib/buildql/buildql.md#buildql"
        target="_blank"
        rel="noreferrer"
      >
        <Tag size="xs">
          {!!search.buildQlError && <ErrorBubble />}
          BuildQL
        </Tag>
      </a>
    </DefaultTooltip>
  );

  return (
    <search className={cx(css["container"], css[mode])} data-testid="search">
      <div className={css["row"]}>
        {slotLeft}
        <div className={css["field"]}>
          <SearchInput
            data-testid="search-input"
            error={search.buildQlError}
            id="card-search-input"
            label={t("lists.search.placeholder")}
            inputClassName={css["field-input"]}
            onValueChange={onValueChange}
            onKeyDown={onInputKeyDown}
            placeholder={t("lists.search.placeholder")}
            iconSlotSize={iconSlotSize}
            iconSlot={
              <div className={css["buildql-input-tag"]} ref={iconSlotRef}>
                {iconSlotNode}
              </div>
            }
            ref={inputRef}
            value={inputValue}
          />
        </div>
        {slotRight}
      </div>
      <div className={css["flags"]}>
        <div className={css["buildql-flags-tag"]}>{iconSlotNode}</div>
        <div className={css["flags-slot"]}>{slotFlags}</div>
        {}
        {search.mode === "simple" && (
          <>
            <Checkbox
              checked={search.includeName}
              data-testid="search-card-name"
              id="search-card-name"
              label={t("lists.search.include_name")}
              onCheckedChange={onToggleCardName}
            />
            <Checkbox
              checked={search.includeGameText}
              data-testid="search-game-text"
              id="search-game-text"
              label={t("lists.search.include_game_text")}
              onCheckedChange={onToggleGameText}
            />
            <Checkbox
              checked={search.includeFlavor}
              id="search-game-flavor"
              label={t("lists.search.include_flavor")}
              onCheckedChange={onToggleFlavor}
            />
          </>
        )}
        <Checkbox
          checked={search.includeBacks}
          id="search-back"
          label={t("lists.search.include_backs")}
          onCheckedChange={onToggleBacks}
        />
      </div>
    </search>
  );
}
