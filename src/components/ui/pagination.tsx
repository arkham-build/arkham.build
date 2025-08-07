import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./button";
import css from "./pagination.module.css";

type Props = {
  disabled?: boolean;
  limit: number;
  lookaround?: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
  total: number;
};

export function Pagination(props: Props) {
  const { t } = useTranslation();

  const {
    disabled,
    limit,
    lookaround = 2,
    offset,
    onOffsetChange,
    total,
  } = props;

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  const handlePageClick = (page: number) => {
    onOffsetChange((page - 1) * limit);
  };

  const getVisiblePages = () => {
    const pages = [];

    if (currentPage > lookaround + 1) {
      pages.push(1);
    }

    for (let i = Math.max(1, currentPage - lookaround); i < currentPage; i++) {
      pages.push(i);
    }

    pages.push(currentPage);

    for (
      let i = currentPage + 1;
      i <= Math.min(totalPages, currentPage + lookaround);
      i++
    ) {
      pages.push(i);
    }

    if (currentPage < totalPages - lookaround) {
      pages.push(totalPages);
    }

    return [...new Set(pages)].sort((a, b) => a - b);
  };

  const visiblePages = getVisiblePages();

  return (
    <nav className={css["pagination"]}>
      <Button
        disabled={disabled || currentPage === 1}
        onClick={() => handlePageClick(currentPage - 1)}
        tooltip={t("ui.pagination.previous")}
        variant="bare"
      >
        <ChevronLeftIcon />
      </Button>

      {visiblePages.map((page, index) => {
        const prevPage = visiblePages[index - 1];
        const showGap = prevPage && page - prevPage > 1;

        return (
          <div key={page} className={css["pagination-item"]}>
            {showGap && <span className={css["pagination-gap"]}>…</span>}
            <Button
              disabled={disabled}
              onClick={() => handlePageClick(page)}
              variant={page === currentPage ? "primary" : "bare"}
            >
              {page}
            </Button>
          </div>
        );
      })}

      <Button
        disabled={disabled || currentPage === totalPages}
        onClick={() => handlePageClick(currentPage + 1)}
        variant="bare"
        tooltip={t("ui.pagination.next")}
      >
        <ChevronRightIcon />
      </Button>
    </nav>
  );
}
