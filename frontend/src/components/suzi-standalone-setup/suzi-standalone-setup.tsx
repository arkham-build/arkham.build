import type { Card } from "@arkham-build/shared";
import { CheckIcon, DicesIcon, EyeIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { cardLevel } from "@/utils/card-utils";
import { isEmpty } from "@/utils/is-empty";
import { shuffle } from "@/utils/shuffle";
import { getAccentColorsForFaction } from "@/utils/use-accent-color";
import { CardScanControlled } from "../card-scan";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { useDialogContextChecked } from "../ui/dialog.hooks";
import { Field, FieldLabel } from "../ui/field";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalInner,
} from "../ui/modal";
import { selectAvailableUpgrades, selectDependencies } from "./selectors";
import { SuziStandaloneSetupBackdrop } from "./suzi-standalone-backdrop";
import css from "./suzi-standalone-setup.module.css";

type Props = {
  children: React.ReactNode;
  deck: ResolvedDeck;
};

export function SuziStandaloneSetupDialog(props: Props) {
  const { children, deck } = props;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <SuziStandaloneSetup deck={deck} />
      </DialogContent>
    </Dialog>
  );
}

function SuziStandaloneSetup(props: Pick<Props, "deck">) {
  const dialogContext = useDialogContextChecked();

  if (!dialogContext.open) {
    return null;
  }

  return <SuziStandaloneSetupInner {...props} />;
}

function SuziStandaloneSetupInner(props: Pick<Props, "deck">) {
  const { deck } = props;

  const [, navigate] = useLocation();
  const dialogContext = useDialogContextChecked();
  const { t } = useTranslation();

  const { createEdit, defaultContentType, hasCollection, hasFanMadeContent } =
    useStore(selectDependencies);

  const [results, setResults] = useState<Card[]>([]);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [xp, setXp] = useState<string>("");
  const [checkOwnership, setCheckOwnership] = useState<boolean>(hasCollection);
  const [includeFanMade, setIncludeFanmade] = useState<boolean>(
    defaultContentType === "fan-made",
  );
  const [ultimatumOfExile, setUltimatumOfExile] = useState<boolean>(false);

  useEffect(
    () => () => {
      setResults([]);
      setRevealed({});
    },
    [],
  );

  const drawResults = useCallback(
    (evt: React.FormEvent) => {
      evt.preventDefault();

      const state = useStore.getState();
      const availableUpgrades = shuffle(
        selectAvailableUpgrades(state, deck, {
          checkOwnership,
          ultimatumOfExile,
          includeFanMade,
        }),
      );

      let targetXp = +xp;
      const drawn: Card[] = [];

      for (const card of availableUpgrades) {
        const cost = cardLevel(card) ?? 0;
        if (cost <= targetXp) {
          targetXp -= cost;
          drawn.push(card);
        }

        if (targetXp <= 0) break;
      }

      setResults(drawn);
      setRevealed({});
    },
    [deck, xp, checkOwnership, includeFanMade, ultimatumOfExile],
  );

  const closeModal = useCallback(() => {
    dialogContext.setOpen(false);
  }, [dialogContext]);

  const applyResultsToDeck = useCallback(() => {
    createEdit(deck.id, {
      quantities: {
        slots: {
          ...deck.slots,
          ...results.reduce(
            (acc, card) => {
              acc[card.code] = (acc[card.code] ?? 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
        },
      },
    });

    navigate(`~/deck/edit/${deck.id}`);
  }, [createEdit, navigate, deck, results]);

  const revealAll = useCallback(() => {
    setRevealed((prev) => {
      const newRevealed: Record<number, boolean> = {};
      results.forEach((_, idx) => {
        newRevealed[idx] = !prev[idx] || prev[idx];
      });
      return newRevealed;
    });
  }, [results]);

  return (
    <Modal className={css["modal"]}>
      <SuziStandaloneSetupBackdrop />
      <ModalInner size="64rem">
        <ModalActions />
        <DefaultModalContent
          className={css["modal-content"]}
          mainClassName={css["container"]}
          title={
            <>
              <DicesIcon />
              {t("suzi_standalone_setup.title")}
            </>
          }
        >
          <div className="longform">
            <p>{t("suzi_standalone_setup.description")}</p>
          </div>
          <form className={css["xp-form"]} onSubmit={drawResults}>
            <Field full>
              <FieldLabel>{t("suzi_standalone_setup.xp")}</FieldLabel>
              <input
                // biome-ignore lint/a11y/noAutofocus: expected here.
                autoFocus
                type="number"
                min={1}
                name="xp"
                onChange={(evt) => setXp(evt.target.value)}
                required
                value={xp}
              />
            </Field>
            {hasCollection && (
              <Checkbox
                checked={checkOwnership}
                id="limit-collection"
                label={t("suzi_standalone_setup.limit_collection")}
                name="limit-collection"
                onCheckedChange={(val) => setCheckOwnership(!!val)}
              />
            )}
            {hasFanMadeContent && (
              <Checkbox
                checked={includeFanMade}
                id="limit-fan-made"
                label={t("suzi_standalone_setup.limit_fan_made")}
                name="limit-fan-made"
                onCheckedChange={(val) => setIncludeFanmade(!!val)}
              />
            )}
            <Checkbox
              checked={ultimatumOfExile}
              id="limit-exile"
              name="limit-exile"
              label={t("suzi_standalone_setup.limit_exile")}
              onCheckedChange={(val) => setUltimatumOfExile(!!val)}
            />
            <Button
              type="submit"
              variant={isEmpty(results) ? "primary" : "secondary"}
            >
              <DicesIcon /> {t("suzi_standalone_setup.draw_cards")}
            </Button>
          </form>
          {!isEmpty(results) && (
            <section className={css["results-container"]}>
              <header className={css["results-header"]}>
                <h3>{t("suzi_standalone_setup.results")}</h3>
                <Button onClick={revealAll}>
                  <EyeIcon />
                  {t("suzi_standalone_setup.reveal_all")}
                </Button>
              </header>
              <ul className={css["results"]}>
                {results.map((card, idx) => (
                  <li
                    className={css["result"]}
                    key={card.code}
                    style={
                      {
                        ...getAccentColorsForFaction(card),
                        "--level": cardLevel(card) ?? 0,
                      } as React.CSSProperties
                    }
                  >
                    <button
                      className={css["result-trigger"]}
                      onClick={() => {
                        setRevealed((prev) => ({
                          ...prev,
                          [idx]: !prev[idx] || prev[idx],
                        }));
                      }}
                      type="button"
                    >
                      <CardScanControlled
                        flipped={!revealed[idx]}
                        hideFlipButton
                        card={card}
                        draggable={false}
                      />
                    </button>
                  </li>
                ))}
              </ul>
              <div className={css["results-actions"]}>
                <Button
                  onClick={applyResultsToDeck}
                  variant="primary"
                  size="lg"
                >
                  <CheckIcon />
                  {t("common.proceed")}
                </Button>
                <Button onClick={closeModal} variant="bare" size="lg">
                  {t("common.cancel")}
                </Button>
              </div>
            </section>
          )}
        </DefaultModalContent>
      </ModalInner>
    </Modal>
  );
}
