import { ChevronLeftIcon, ChevronUpIcon, ListIcon, XIcon } from "lucide-react";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Scroller } from "@/components/ui/scroller";
import { SearchInput } from "@/components/ui/search-input";
import { cx } from "@/utils/cx";
import { useGoBack } from "@/utils/use-go-back";
import { useHotkey } from "@/utils/use-hotkey";

type Props = {
  renderContent: (search: string) => React.ReactNode;
  renderToc: (search: string) => React.ReactNode;
  searchEnabled?: boolean;
};

export function RulesDocument({
  renderContent,
  renderToc,
  searchEnabled = true,
}: Props) {
  const { t } = useTranslation();
  const goBack = useGoBack();

  const [searchInput, setSearchInput] = useState("");
  const [tocOpen, setTocOpen] = useState(false);

  const search = useDeferredValue(searchInput);

  const tocTriggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const tocRef = useRef<HTMLDivElement>(null);

  const onToggleToc = useCallback(() => {
    setTocOpen((prev) => !prev);
  }, []);

  const onCloseToc = useCallback(() => {
    setTocOpen(false);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setTocOpen(false);
      setTimeout(() => {
        const hash = window.location.hash.slice(1);
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "auto" });
      });
    };

    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  useHotkey("/", () => {
    if (!searchEnabled) return;
    searchRef.current?.focus();
  });

  useClickOutside(tocRef, tocTriggerRef, onCloseToc, tocOpen);

  return (
    <div className="container">
      <Button
        className="toc-toggle"
        onClick={onToggleToc}
        ref={tocTriggerRef}
        size="xl"
        variant="primary"
      >
        {tocOpen ? <XIcon /> : <ListIcon />} {t("rules.toc")}
      </Button>
      <div className={cx("toc-container", tocOpen && "open")} ref={tocRef}>
        <h1 className="toc-title">{t("rules.toc")}</h1>

        {searchEnabled && (
          <div className="toc-search">
            <SearchInput
              className="rules-search"
              id="rules-search"
              onValueChange={setSearchInput}
              placeholder={t("rules.search_placeholder")}
              ref={searchRef}
              value={searchInput}
            />
          </div>
        )}

        <nav className="toc-nav">
          <Button size="sm" onClick={goBack}>
            <ChevronLeftIcon />
            {t("common.back")}
          </Button>
          <Button size="sm" as="a" href="#">
            <ChevronUpIcon />
            {t("rules.back_to_top")}
          </Button>
        </nav>

        <Scroller className="toc-inner" padded>
          <RulesToc renderToc={renderToc} search={search} />
        </Scroller>
      </div>

      <div className="rules-container">
        <RulesContent renderContent={renderContent} search={search} />
      </div>
    </div>
  );
}

const RulesToc = memo(function RulesToc({
  renderToc,
  search,
}: {
  renderToc: (search: string) => React.ReactNode;
  search: string;
}) {
  return renderToc(search);
});

const RulesContent = memo(function RulesContent({
  renderContent,
  search,
}: {
  renderContent: (search: string) => React.ReactNode;
  search: string;
}) {
  return renderContent(search);
});

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  triggerRef: React.RefObject<HTMLElement | null>,
  onClickOutside: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    function handleClickOutside(evt: MouseEvent) {
      if (
        enabled &&
        ref.current &&
        !ref.current.contains(evt.target as Node) &&
        evt.target !== triggerRef.current &&
        !triggerRef.current?.contains(evt.target as Node)
      ) {
        evt.preventDefault();
        onClickOutside();
      }
    }

    document.addEventListener("pointerdown", handleClickOutside);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [enabled, onClickOutside, ref, triggerRef]);
}
