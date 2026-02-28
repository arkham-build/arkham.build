/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: trusted content. */
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/layouts/app-layout";
import { parseCardTextHtml } from "@/utils/card-utils";
import "./rules-reference.css";
import { ChevronLeftIcon, ChevronUpIcon, ListIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import html from "@/assets/rules.html?raw";
import { Button } from "@/components/ui/button";
import { Scroller } from "@/components/ui/scroller";
import { SearchInput } from "@/components/ui/search-input";
import { cx } from "@/utils/cx";
import { fuzzyMatch, prepareNeedle } from "@/utils/fuzzy";
import { useGoBack } from "@/utils/use-go-back";
import { useHotkey } from "@/utils/use-hotkey";

function RulesReference() {
  const { t } = useTranslation();

  const [toc, rules] = html.split("<!-- BEGIN RULES -->");

  const [tocOpen, setTocOpen] = useState(false);
  const [search, setSearch] = useState("");

  const tocTriggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const $content = contentRef.current?.querySelector("#rules");
    const needle = prepareNeedle(search);

    if (!$content) return;

    const matchingSections = new Set();
    let currentSectionStart = 0;
    let currentSectionMatches = false;

    for (let i = 0; i < $content.children.length; i++) {
      const node = $content.children[i];
      if (!(node instanceof HTMLElement)) continue;

      const id = node.getAttribute("id");

      if (id) {
        currentSectionStart = i;
        currentSectionMatches = false;
      }

      const cloned = node.cloneNode(true) as HTMLElement;
      replaceIcons(cloned);

      const text = cloned.innerText.toLowerCase() || "";

      if (id && (!needle || search.length <= 2 || fuzzyMatch([text], needle))) {
        matchingSections.add(id);
        currentSectionMatches = true;
      }

      cloned.remove();

      for (let j = currentSectionStart; j <= i; j++) {
        const sectionNode = $content.children[j];
        if (!(sectionNode instanceof HTMLElement)) continue;
        sectionNode.style.display = currentSectionMatches ? "" : "none";
      }
    }
  }, [search]);

  useEffect(() => {
    const onHashChange = () => {
      setSearch("");
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
    searchRef.current?.focus();
  });

  const goBack = useGoBack();

  const onToggleToc = useCallback(() => {
    setTocOpen((prev) => !prev);
  }, []);

  const onCloseToc = useCallback(() => {
    setTocOpen(false);
  }, []);

  useClickOutside(tocRef, tocTriggerRef, onCloseToc, tocOpen);

  return (
    <AppLayout title={t("rules.title")}>
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

          <div className="toc-inner">
            <SearchInput
              className="rules-search"
              id="rules-search"
              onValueChange={setSearch}
              placeholder={t("rules.search_placeholder")}
              ref={searchRef}
              value={search}
            />
          </div>

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

          <Scroller className="toc-inner">
            <div
              dangerouslySetInnerHTML={{
                __html: parseCardTextHtml(toc, { newLines: "skip" }),
              }}
            />
          </Scroller>
        </div>
        <div className="rules-container">
          <div
            ref={contentRef}
            dangerouslySetInnerHTML={{
              __html: parseCardTextHtml(rules, { newLines: "skip" }),
            }}
          />
        </div>
      </div>
    </AppLayout>
  );
}

function replaceIcons(node: Element) {
  for (const icon of node.querySelectorAll("i")) {
    const iconName = icon.getAttribute("class")?.split("-").at(1);
    if (iconName) {
      icon.replaceWith(document.createTextNode(`[${iconName}]`));
    }
  }
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  tocTriggerRef: React.RefObject<HTMLElement | null>,
  onClickOutside: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    function handleClickOutside(evt: MouseEvent) {
      if (
        enabled &&
        ref.current &&
        !ref.current.contains(evt.target as Node) &&
        evt.target !== tocTriggerRef.current &&
        !tocTriggerRef.current?.contains(evt.target as Node)
      ) {
        evt.preventDefault();
        onClickOutside();
      }
    }

    document.addEventListener("pointerdown", handleClickOutside);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [ref, onClickOutside, enabled, tocTriggerRef]);
}

export default RulesReference;
