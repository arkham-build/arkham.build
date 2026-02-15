import type { Card } from "@arkham-build/shared";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, ExternalLinkIcon } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  deckSearchQuery,
  searchDecklists,
} from "@/store/services/requests/decklists-search";
import { displayAttribute, getCanonicalCardCode } from "@/utils/card-utils";
import { getAccentColorsForFaction } from "@/utils/use-accent-color";
import { CardLink } from "../card-link";
import { Expander } from "../ui/expander";
import { Loader } from "../ui/loader";
import { Plane } from "../ui/plane";
import { ArkhamDBDecklistResult } from "./arkhamdb-decklist-result";
import css from "./popular-decks.module.css";

type Props = {
  scope: Card;
};

export function PopularDecks(props: Props) {
  const { scope } = props;
  const { t } = useTranslation();

  const enabled = !scope.encounter_code;

  const scopeParams = {
    filters: {
      canonical_investigator_code:
        scope.type_code === "investigator"
          ? `${scope.code}-${scope.code}`
          : undefined,
      required:
        scope.type_code !== "investigator" ? [getCanonicalCardCode(scope)] : [],
    },
  };

  const { data, error, isPending } = useQuery({
    queryKey: ["popular-decks", scope.code],
    queryFn: () => searchDecklists(deckSearchQuery(scopeParams, 10)),
    enabled,
  });

  if (!enabled) return null;

  const title = (
    <Trans
      t={t}
      i18nKey={
        scope.type_code === "investigator"
          ? "popular_decks.title_investigator"
          : "popular_decks.title_card"
      }
      values={{ name: displayAttribute(scope, "name") }}
      components={{
        tooltip: <CardLink card={scope} />,
      }}
    />
  );

  return (
    <Plane
      as="article"
      className={css["container"]}
      style={getAccentColorsForFaction(scope)}
    >
      <header className={css["header"]}>
        <h3 className={css["title"]}>
          <i className="icon-elder_sign" />
          {title}
        </h3>
        <Link
          className={css["title-link"]}
          to={`~/decklists?${deckSearchQuery(scopeParams, 30).toString()}`}
          target="_blank"
        >
          <ExternalLinkIcon />
          {t("popular_decks.decklists_link")}
        </Link>
      </header>

      {isPending && (
        <div className={css["status"]}>
          <Loader show />
        </div>
      )}

      {data?.data.length === 0 && (
        <output className={css["status"]}>
          <div className={css["status-inner"]}>
            <AlertCircleIcon className={css["status-icon"]} />
            <p>{t("popular_decks.no_results")}</p>
          </div>
        </output>
      )}

      {error && (
        <output className={css["status"]}>
          <div className={css["status-inner"]}>
            <AlertCircleIcon className={css["status-icon"]} />
            <p>
              {t("popular_decks.error", {
                error: (error as Error).message,
              })}
            </p>
          </div>
        </output>
      )}

      {data && (
        <Expander collapsedHeight="19.5rem">
          <ol className={css["decks"]}>
            {data.data.map((result) => (
              <li key={result.id}>
                <ArkhamDBDecklistResult result={result} />
              </li>
            ))}
          </ol>
        </Expander>
      )}
    </Plane>
  );
}
