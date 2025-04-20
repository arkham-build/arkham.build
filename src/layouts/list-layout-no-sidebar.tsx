import { CardListContainer } from "@/components/card-list/card-list-container";
import { Filters } from "@/components/filters/filters";
import { Masthead } from "@/components/masthead";
import { Button } from "@/components/ui/button";
import { cx } from "@/utils/cx";
import { useDocumentTitle } from "@/utils/use-document-title";
import { useGoBack } from "@/utils/use-go-back";
import { useMedia } from "@/utils/use-media";
import { ChevronLeftIcon, FilterIcon } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useListLayoutContext } from "./list-layout-context";
import css from "./list-layout-no-sidebar.module.css";

interface Props extends React.ComponentProps<typeof CardListContainer> {
  titleString: string;
  title?: React.ReactNode;
}

/**
 * TODO: TECH DEBT
 * This component should be removed and folded into a refactored ListLayout component.
 */
export function ListLayoutNoSidebar(props: Props) {
  const { title, titleString, ...rest } = props;
  const { t } = useTranslation();

  const { filtersOpen, setFiltersOpen } = useListLayoutContext();

  const floatingFilters = useMedia("(max-width: 52rem)");

  useDocumentTitle(titleString);

  const goBack = useGoBack();

  const preventBubble = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  const onContentClick = useCallback(
    (evt: React.PointerEvent) => {
      if (filtersOpen && floatingFilters) {
        evt.preventDefault();
        setFiltersOpen(false);
      }
    },
    [filtersOpen, floatingFilters, setFiltersOpen],
  );

  const floatingMenuOpen =
    floatingFilters && filtersOpen && css["floating-menu-open"];

  useEffect(() => {
    setFiltersOpen(!floatingFilters);

    return () => {
      setFiltersOpen(!floatingFilters);
    };
  }, [floatingFilters, setFiltersOpen]);

  return (
    <div
      className={cx(
        css["layout"],
        floatingMenuOpen && css["floating-menu-open"],
        "fade-in",
      )}
      onPointerDown={onContentClick}
    >
      <Masthead className={css["masthead"]}>
        <Button onClick={goBack} variant="bare" size="sm">
          <ChevronLeftIcon /> {t("common.back")}
        </Button>
      </Masthead>
      <main
        className={cx(css["content"], !filtersOpen && css["collapsed-filters"])}
      >
        <CardListContainer
          {...rest}
          slotRight={
            !filtersOpen && (
              <Button
                className={css["toggle-filters"]}
                onClick={() => setFiltersOpen(true)}
                iconOnly
                size="lg"
              >
                <FilterIcon />
              </Button>
            )
          }
          topContent={
            <header className={css["header"]}>
              <h1 className={css["title"]}>{title ?? titleString}</h1>
            </header>
          }
        />
      </main>
      <nav
        className={cx(css["filters"], floatingFilters && css["floating"])}
        data-state={filtersOpen ? "open" : "closed"}
        onPointerDown={floatingFilters ? preventBubble : undefined}
      >
        <Filters />
      </nav>
    </div>
  );
}
