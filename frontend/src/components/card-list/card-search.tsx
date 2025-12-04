import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectActiveListSearch } from "@/store/selectors/lists";
import { assert } from "@/utils/assert";
import { cx } from "@/utils/cx";
import { debounce } from "@/utils/debounce";
import { useAgathaEasterEggTrigger } from "@/utils/easter-egg-agatha";
import { useHotkey } from "@/utils/use-hotkey";
import { Checkbox } from "../ui/checkbox";
import { SearchInput } from "../ui/search-input";
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

  const setSearchValue = useStore((state) => state.setSearchValue);
  const setSearchFlag = useStore((state) => state.setSearchFlag);

  const search = useStore(selectActiveListSearch);
  assert(search, "Search bar requires an active list.");

  const easterEggHandler = useAgathaEasterEggTrigger();

  const [inputValue, setInputValue] = useState(search.value ?? "");

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
      debouncedSetSearchValue(val);
      if (easterEggHandler(val)) {
        setInputValue("");
        debouncedSetSearchValue("");
      }
    },
    [debouncedSetSearchValue, easterEggHandler],
  );

  const onToggleGameText = useCallback(
    (val: boolean | string) => {
      setSearchFlag("includeGameText", !!val);
      inputRef.current?.focus();
    },
    [setSearchFlag],
  );

  const onToggleFlavor = useCallback(
    (val: boolean | string) => {
      setSearchFlag("includeFlavor", !!val);
      inputRef.current?.focus();
    },
    [setSearchFlag],
  );

  const onToggleBacks = useCallback(
    (val: boolean | string) => {
      setSearchFlag("includeBacks", !!val);
      inputRef.current?.focus();
    },
    [setSearchFlag],
  );

  const onToggleCardName = useCallback(
    (val: boolean | string) => {
      setSearchFlag("includeName", !!val);
      inputRef.current?.focus();
    },
    [setSearchFlag],
  );

  return (
    <search className={cx(css["container"], css[mode])} data-testid="search">
      <div className={css["row"]}>
        {slotLeft}
        <div className={css["field"]}>
          <SearchInput
            data-testid="search-input"
            id="card-search-input"
            label={t("lists.search.placeholder")}
            inputClassName={css["field-input"]}
            onChangeValue={onValueChange}
            onKeyDown={onInputKeyDown}
            placeholder={t("lists.search.placeholder")}
            ref={inputRef}
            value={inputValue}
          />
        </div>
        {slotRight}
      </div>
      <div className={css["flags"]}>
        <div className={css["flags-slot"]}>{slotFlags}</div>
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
