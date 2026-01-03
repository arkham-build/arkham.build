/** biome-ignore-all lint/a11y: TODO */
import { FilterIcon } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CollapseSidebarButton } from "@/components/collapse-sidebar-button";
import { Masthead } from "@/components/masthead";
import { Button } from "@/components/ui/button";
import { HotkeyTooltip } from "@/components/ui/hotkey";
import { MQ_FLOATING_FILTERS, MQ_FLOATING_SIDEBAR } from "@/utils/constants";
import { cx } from "@/utils/cx";
import { useHotkey } from "@/utils/use-hotkey";
import { useMedia } from "@/utils/use-media";
import css from "./list-layout.module.css";
import { useListLayoutContext } from "./list-layout-context";

type Props = {
  children: (props: {
    slotRight?: React.ReactNode;
    slotLeft?: React.ReactNode;
  }) => React.ReactNode;
  className?: string;
  filters?: React.ReactNode;
  hideSidebarCollapse?: boolean;
  mastheadContent?: React.ReactNode;
  noFade?: boolean;
  sidebar: React.ReactNode;
  sidebarWidthMax: string;
};

export function ListLayout(props: Props) {
  const {
    children,
    className,
    filters,
    hideSidebarCollapse,
    mastheadContent,
    noFade,
    sidebar,
    sidebarWidthMax,
  } = props;

  const { t } = useTranslation();

  const { filtersOpen, sidebarOpen, setFiltersOpen, setSidebarOpen } =
    useListLayoutContext();

  const floatingSidebar = useMedia(MQ_FLOATING_SIDEBAR);
  const floatingFilters = useMedia(MQ_FLOATING_FILTERS);

  const filtersRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const onContentClick = useCallback(
    (evt: React.MouseEvent) => {
      if (filtersOpen && floatingFilters) {
        setFiltersOpen(false);
        evt.preventDefault();
      }

      if (sidebarOpen && floatingSidebar) {
        setSidebarOpen(false);
        evt.preventDefault();
      }
    },
    [
      filtersOpen,
      sidebarOpen,
      setSidebarOpen,
      setFiltersOpen,
      floatingFilters,
      floatingSidebar,
    ],
  );

  const preventBubble = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  useEffect(() => {
    setSidebarOpen(!floatingSidebar);

    return () => {
      setSidebarOpen(!floatingSidebar);
    };
  }, [floatingSidebar, setSidebarOpen]);

  useEffect(() => {
    setFiltersOpen(!floatingFilters);

    return () => {
      setFiltersOpen(!floatingFilters);
    };
  }, [floatingFilters, setFiltersOpen]);

  const floatingMenuOpen =
    ((floatingSidebar && sidebarOpen) || (floatingFilters && filtersOpen)) &&
    css["floating-menu-open"];

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => !open);
  }, [setSidebarOpen]);

  const toggleFilters = useCallback(() => {
    setFiltersOpen((open) => !open);
  }, [setFiltersOpen]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
  }, [setFiltersOpen]);

  useHotkey("alt+1", toggleSidebar);
  useHotkey("alt+2", toggleFilters);

  return (
    <div
      className={cx(
        css["layout"],
        !noFade && "fade-in",
        className,
        floatingMenuOpen && css["floating-menu-open"],
        filters && css["has-filters"],
      )}
      onClick={onContentClick}
      style={{ "--sidebar-width-max": sidebarWidthMax } as React.CSSProperties}
    >
      <Masthead className={css["header"]}>{mastheadContent}</Masthead>
      <div
        className={cx(css["sidebar"], floatingSidebar && css["floating"])}
        data-state={sidebarOpen ? "open" : "closed"}
        onClick={sidebarOpen ? preventBubble : undefined}
        ref={sidebarRef}
      >
        {!hideSidebarCollapse && (
          <CollapseSidebarButton
            className={css["collapse"]}
            hotkey="alt+1"
            hotkeyLabel={t("lists.actions.toggle_sidebar")}
            onClick={closeSidebar}
            orientation="left"
          />
        )}
        {sidebar}
      </div>
      <div
        className={cx(
          css["content"],
          (floatingSidebar || !sidebarOpen) && css["collapsed-sidebar"],
          (floatingFilters || !filtersOpen) && css["collapsed-filters"],
        )}
        onClick={onContentClick}
      >
        {children({
          slotLeft: !sidebarOpen && (
            <HotkeyTooltip
              keybind="alt+1"
              description={t("lists.actions.toggle_sidebar")}
            >
              <Button
                className={css["toggle-sidebar"]}
                onClick={toggleSidebar}
                iconOnly
                size="lg"
              >
                <i className="icon-deck" />
              </Button>
            </HotkeyTooltip>
          ),
          slotRight: !!filters && !filtersOpen && (
            <HotkeyTooltip
              keybind="alt+2"
              description={t("lists.actions.toggle_filters")}
            >
              <Button
                className={css["toggle-filters"]}
                onClick={toggleFilters}
                iconOnly
                size="lg"
              >
                <FilterIcon />
              </Button>
            </HotkeyTooltip>
          ),
        })}
      </div>
      {filters && (
        <nav
          className={cx(css["filters"], floatingFilters && css["floating"])}
          data-state={filtersOpen ? "open" : "closed"}
          onClick={floatingFilters ? preventBubble : undefined}
          ref={filtersRef}
        >
          <CollapseSidebarButton
            className={css["collapse"]}
            onClick={closeFilters}
            hotkey="alt+2"
            hotkeyLabel={t("lists.actions.toggle_filters")}
            orientation="right"
          />
          {filters}
        </nav>
      )}
    </div>
  );
}
