import { CheckIcon, ClipboardCopyIcon, Share2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useStore } from "@/store";
import {
  setSearchContextParams,
  setSearchFlagParams,
} from "@/store/lib/search-url";
import {
  selectActiveListSearch,
  selectCanonicalTabooSetId,
} from "@/store/selectors/lists";
import { selectActiveList } from "@/store/selectors/shared";
import { assert } from "@/utils/assert";
import { cx } from "@/utils/cx";
import { debounce } from "@/utils/debounce";
import { useAgathaEasterEggTrigger } from "@/utils/easter-egg-agatha";
import { useCopyToClipboard } from "@/utils/use-copy-to-clipboard";
import { useHotkey } from "@/utils/use-hotkey";
import { useResolvedDeck } from "../resolved-deck-context";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  DropdownButton,
  DropdownMenu,
  DropdownMenuSection,
} from "../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { SearchInput } from "../ui/search-input";
import { StatusBubble } from "../ui/status-bubble";
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
  const activeList = useStore(selectActiveList);
  const visibleTabooSetId = useStore((state) =>
    selectCanonicalTabooSetId(state, resolvedDeck),
  );
  assert(search, "Search bar requires an active list.");
  assert(activeList, "Search bar requires an active list.");

  const { includeBacks, includeFlavor, includeGameText, includeName } = search;

  const easterEggHandler = useAgathaEasterEggTrigger();

  const [inputValue, setInputValue] = useState(search.value ?? "");
  const [iconSlotSize, setIconSlotSize] = useState(0);
  const [sharePreferences, setSharePreferences] = useState(
    loadSearchSharePreferences,
  );
  const { matchDisplayMode, matchVisibleTaboo } = sharePreferences;

  const pasted = useRef(false);

  const cardType = useMemo(() => {
    const id = activeList?.filters.indexOf("card_type");
    if (id == null || id < 0) return "";
    const value = activeList?.filterValues[id]?.value;
    return value === "player" || value === "encounter" ? value : "";
  }, [activeList]);

  const onMatchDisplayModeChange = useCallback(
    (value: boolean) => {
      setSharePreferences({ ...sharePreferences, matchDisplayMode: value });
    },
    [sharePreferences],
  );

  const onMatchVisibleTabooChange = useCallback(
    (value: boolean) => {
      setSharePreferences({ ...sharePreferences, matchVisibleTaboo: value });
    },
    [sharePreferences],
  );

  const shareUrl = useMemo(() => {
    const url = new URL("/search", window.location.origin);
    url.searchParams.set("q", inputValue);
    if (cardType) url.searchParams.set("card_type", cardType);
    setSearchFlagParams(url.searchParams, {
      includeBacks,
      includeFlavor,
      includeGameText,
      includeName,
    });
    setSearchContextParams(url.searchParams, {
      displayMode: activeList.display.viewMode,
      matchDisplayMode,
      matchVisibleTaboo,
      tabooSetId: visibleTabooSetId,
    });
    return url.toString();
  }, [
    activeList.display.viewMode,
    cardType,
    includeBacks,
    includeFlavor,
    includeGameText,
    includeName,
    inputValue,
    matchDisplayMode,
    matchVisibleTaboo,
    visibleTabooSetId,
  ]);

  useEffect(() => {
    storeSearchSharePreferences(sharePreferences);
  }, [sharePreferences]);

  useEffect(() => {
    const iconSlot = iconSlotRef.current;
    if (!iconSlot) return;

    const updateIconSlotSize = () => {
      setIconSlotSize(iconSlot.getBoundingClientRect().width);
    };

    updateIconSlotSize();

    const resizeObserver = new ResizeObserver(updateIconSlotSize);
    resizeObserver.observe(iconSlot);
    return () => resizeObserver.disconnect();
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
      const changeOpts = {
        clearMode: val.length <= 1 || pasted.current,
      };

      pasted.current = false;
      setInputValue(val);
      debouncedSetSearchValue(val, resolvedDeck, changeOpts);

      if (easterEggHandler(val)) {
        setInputValue("");
        debouncedSetSearchValue("", resolvedDeck, changeOpts);
      }
    },
    [debouncedSetSearchValue, easterEggHandler, resolvedDeck],
  );

  const onInputPaste = useCallback(() => {
    pasted.current = true;
  }, []);

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
    <>
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
            {!!search.buildQlError && <StatusBubble variant="error" />}
            BuildQL
          </Tag>
        </a>
      </DefaultTooltip>
      {!!inputValue && (
        <SearchShare
          matchDisplayMode={matchDisplayMode}
          matchVisibleTaboo={matchVisibleTaboo}
          onMatchDisplayModeChange={onMatchDisplayModeChange}
          onMatchVisibleTabooChange={onMatchVisibleTabooChange}
          shareUrl={shareUrl}
        />
      )}
    </>
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
            onPaste={onInputPaste}
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

function SearchShare({
  matchDisplayMode,
  matchVisibleTaboo,
  onMatchDisplayModeChange,
  onMatchVisibleTabooChange,
  shareUrl,
}: {
  matchDisplayMode: boolean;
  matchVisibleTaboo: boolean;
  onMatchDisplayModeChange: (value: boolean) => void;
  onMatchVisibleTabooChange: (value: boolean) => void;
  shareUrl: string;
}) {
  const { t } = useTranslation();
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  const onCopy = useCallback(() => {
    void copyToClipboard(shareUrl).catch(console.error);
  }, [copyToClipboard, shareUrl]);

  return (
    <Popover clickStickIfOpen={false} placement="bottom-end">
      <PopoverTrigger asChild>
        <Button
          aria-label={t("lists.search.share")}
          data-testid="search-share"
          iconOnly
          onClick={onCopy}
          size="sm"
          tooltip={
            isCopied
              ? t("ui.copy_to_clipboard_success")
              : t("lists.search.share")
          }
          variant="bare"
        >
          {isCopied ? <CheckIcon /> : <Share2Icon />}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <DropdownMenu>
          <DropdownMenuSection title={t("lists.search.share_settings")}>
            <div className={css["share-settings"]}>
              <Checkbox
                checked={matchVisibleTaboo}
                data-testid="search-share-match-taboo"
                label={t("lists.search.match_visible_taboo")}
                onCheckedChange={onMatchVisibleTabooChange}
              />
              <Checkbox
                checked={matchDisplayMode}
                data-testid="search-share-match-display-mode"
                label={t("lists.search.match_display_mode")}
                onCheckedChange={onMatchDisplayModeChange}
              />
            </div>
          </DropdownMenuSection>
          <DropdownMenuSection>
            <DropdownButton onClick={onCopy} size="sm">
              {isCopied ? <CheckIcon /> : <ClipboardCopyIcon />}
              {isCopied
                ? t("ui.copy_to_clipboard_success")
                : t("ui.copy_to_clipboard")}
            </DropdownButton>
          </DropdownMenuSection>
        </DropdownMenu>
      </PopoverContent>
    </Popover>
  );
}

const SEARCH_SHARE_PREFERENCES_KEY = "search-share-preferences";

const SearchSharePreferencesSchema = z.object({
  matchDisplayMode: z.boolean(),
  matchVisibleTaboo: z.boolean(),
});

type SearchSharePreferences = z.infer<typeof SearchSharePreferencesSchema>;

const DEFAULT_SEARCH_SHARE_PREFERENCES: SearchSharePreferences = {
  matchDisplayMode: false,
  matchVisibleTaboo: false,
};

function loadSearchSharePreferences(): SearchSharePreferences {
  const value = localStorage.getItem(SEARCH_SHARE_PREFERENCES_KEY);
  if (!value) return DEFAULT_SEARCH_SHARE_PREFERENCES;

  try {
    const result = SearchSharePreferencesSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : DEFAULT_SEARCH_SHARE_PREFERENCES;
  } catch {
    return DEFAULT_SEARCH_SHARE_PREFERENCES;
  }
}

function storeSearchSharePreferences(preferences: SearchSharePreferences) {
  localStorage.setItem(
    SEARCH_SHARE_PREFERENCES_KEY,
    JSON.stringify(preferences),
  );
}
