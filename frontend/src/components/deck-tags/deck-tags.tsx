import type { TFunction } from "i18next";
import { LockKeyholeIcon, ShareIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectLimitedPoolPacks } from "@/store/selectors/lists";
import { selectMetadata } from "@/store/selectors/shared";
import type { StoreState } from "@/store/slices";
import type { StorageProvider } from "@/utils/constants";
import { resolveLimitedPoolPacks } from "@/utils/environments";
import { capitalize, formatProviderName } from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import PackIcon from "../icons/pack-icon";
import { ListCardInner } from "../list-card/list-card-inner";
import { PackName } from "../pack-name";
import { Tag } from "../ui/tag";
import {
  DefaultTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import css from "./deck-tags.module.css";

const EVERGREEN_CYCLES = [
  "core",
  "investigator",
  "return",
  "core_ch2",
  "investigator_decks_ch2",
];

export function DeckTagsContainer({ children }: { children: React.ReactNode }) {
  return (
    <ul className={css["tags"]} data-testid="deck-tags">
      {children}
      {}
    </ul>
  );
}

export function DeckTags(props: { tags: string[] }) {
  const { tags } = props;

  return tags.map((s, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: order is stable.
    <Tag as="li" key={i} size="xs">
      {capitalize(s.trim())}
    </Tag>
  ));
}

export function SealedDeckTag({
  deck,
}: {
  deck: Pick<ResolvedDeck, "sealedDeck"> | undefined;
}) {
  const { t } = useTranslation();

  const value = deck?.sealedDeck;
  if (!value) return null;

  const count = Object.keys(value.cards).length;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Tag as="li" size="xs">
          {t("deck.tags.sealed")}
        </Tag>
      </TooltipTrigger>
      <TooltipContent>
        {value.name} ({count} {t("common.card", { count })})
      </TooltipContent>
    </Tooltip>
  );
}

export function ProviderTagInner({
  tag,
  t,
}: {
  tag: StorageProvider;
  t: TFunction;
}) {
  let icon = null;

  if (tag === "arkhamdb") {
    icon = <i className="icon-elder_sign" />;
  } else if (tag === "local") {
    icon = <LockKeyholeIcon />;
  } else if (tag === "shared") {
    icon = <ShareIcon />;
  }

  const str = tag.trim();

  return (
    <>
      {icon}
      <span>
        {str === "arkhamdb"
          ? formatProviderName(str)
          : str === "local"
            ? t("deck.tags.private")
            : str === "shared"
              ? t("deck.tags.shared")
              : capitalize(str)}
      </span>
    </>
  );
}

export function ProviderTag({
  deck,
}: {
  deck: Pick<ResolvedDeck, "source" | "shared"> | undefined;
}) {
  const { t } = useTranslation();

  let source: StorageProvider = "local";
  if (deck?.source) {
    source = deck.source as StorageProvider;
  } else if (deck?.shared) {
    source = "shared";
  }

  return (
    <Tag as="li" size="xs">
      <ProviderTagInner tag={source} t={t} />
    </Tag>
  );
}

const selectLimitedCardPoolCards = createSelector(
  selectMetadata,
  (_: StoreState, cardPool: string[] | undefined) => cardPool,
  (metadata, cardPool) => {
    return cardPool
      ?.filter((str) => str.startsWith("card:"))
      .map((str) => metadata.cards[str.replace("card:", "")])
      .filter(Boolean);
  },
);

export function LimitedCardPoolTag({
  deck,
  omitLegacy = false,
}: {
  deck: Pick<ResolvedDeck, "cardPool"> | undefined;
  omitLegacy?: boolean;
}) {
  const { t } = useTranslation();

  const cardPool = deck?.cardPool;

  const selectedPacks = useStore(
    useShallow((state) => selectLimitedPoolPacks(state, cardPool)),
  );

  const selectedCards = useStore((state) =>
    selectLimitedCardPoolCards(state, cardPool),
  );

  if (omitLegacy && !cardPool?.length) {
    return null;
  }

  return (
    <DefaultTooltip
      options={{ placement: "bottom-start" }}
      tooltip={
        selectedPacks.length ? (
          <ol className={css["packs"]}>
            {selectedPacks.map((pack) => {
              return pack ? (
                <li className={css["pack"]} key={pack.code}>
                  <PackName pack={pack} shortenNewFormat />
                </li>
              ) : null;
            })}
            {!isEmpty(selectedCards) &&
              selectedCards.map((card) => (
                <li className={css["pack"]} key={card.code}>
                  <ListCardInner
                    cardShowCollectionNumber
                    cardLevelDisplay="icon-only"
                    size="xs"
                    omitBorders
                    omitThumbnail
                    card={card}
                  />
                </li>
              ))}
          </ol>
        ) : (
          t("deck_edit.config.card_pool.legacy_help")
        )
      }
    >
      <Tag as="li" size="xs" data-testid="limited-card-pool-tag">
        <LimitedPoolLabel cardPool={cardPool} />
      </Tag>
    </DefaultTooltip>
  );
}

function LimitedPoolLabel({ cardPool }: { cardPool: string[] | undefined }) {
  const { t } = useTranslation();
  const metadata = useStore(selectMetadata);

  if (!cardPool?.length) {
    return t("deck_edit.config.card_pool.legacy");
  }

  const packs = resolveLimitedPoolPacks(metadata, cardPool).filter(
    (p) => !EVERGREEN_CYCLES.includes(p.cycle_code),
  );

  // XXX: this will need adjusting once the pool is "full"
  if (packs.every((p) => p.chapter === 2)) {
    return <>{t("deck_edit.config.card_pool.current")}</>;
  }

  if (packs.length !== 3) {
    return t("deck_edit.config.card_pool.custom");
  }

  return (
    <>
      {t("deck_edit.config.card_pool.limited")}
      {packs.map((c) => (
        <PackIcon key={c.code} code={c.code} />
      ))}
    </>
  );
}
