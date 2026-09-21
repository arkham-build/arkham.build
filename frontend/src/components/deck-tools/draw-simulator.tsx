import { type Card, type Id, SPECIAL_CARD_CODES } from "@arkham-build/shared";
import { LockIcon, ShuffleIcon } from "lucide-react";
import { useEffect, useReducer } from "react";
import { useTranslation } from "react-i18next";
import type { ResolvedDeck } from "@/store/lib/types";
import { cx } from "@/utils/cx";
import { isEmpty } from "@/utils/is-empty";
import { range } from "@/utils/range";
import { shuffle } from "@/utils/shuffle";
import { CardScan } from "../card-scan";
import { PortaledCardTooltip } from "../card-tooltip/card-tooltip-portaled";
import { ListCard } from "../list-card/list-card";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Plane } from "../ui/plane";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { DefaultTooltip } from "../ui/tooltip";
import { useRestingTooltip } from "../ui/tooltip.hooks";
import css from "./draw-simulator.module.css";
import { displayAttribute } from "@/utils/card-utils";

type Props = {
  deck: ResolvedDeck;
};

export function DrawSimulator(props: Props) {
  const { deck } = props;

  const { t } = useTranslation();

  const [state, dispatch] = useReducer(drawReducer, initialState(deck));

  const ancestralKnowledgeEntry =
    deck.cards.slots[SPECIAL_CARD_CODES.ANCESTRAL_KNOWLEDGE];

  const ancestralKnowledge =
    (deck.slots[SPECIAL_CARD_CODES.ANCESTRAL_KNOWLEDGE] ?? 0) > 0
      ? ancestralKnowledgeEntry?.card
      : undefined;

  const attachedSkills = state.ancestralKnowledge.flatMap((code) => {
    const card = deck.cards.slots[code]?.card;
    return card ? [card] : [];
  });

  const attachAncestralKnowledge = () => {
    dispatch({ type: "attachAncestralKnowledge", deck });
  };

  const drawAmount = (count: number) => {
    dispatch({ type: "draw", amount: count, deck });
  };

  const reset = () => {
    dispatch({ type: "reset", deck });
  };

  const reshuffle = () => {
    dispatch({ type: "reshuffle" });
  };

  const redraw = () => {
    dispatch({ type: "redraw", deck });
  };

  const toggleMulligan = () => {
    dispatch({ type: "toggleMulligan" });
  };

  useEffect(() => {
    dispatch({ type: "reset", deck });
  }, [deck]);

  return (
    <Plane className={css["container"]} as="article">
      <header className={css["header"]}>
        <h4 className={cx(css["title"])}>
          <ShuffleIcon /> {t("draw_simulator.title")}
        </h4>
      </header>
      <div className={css["nav"]}>
        <DefaultTooltip tooltip={t("draw_simulator.mulligan_mode_help")}>
          <Checkbox
            id="mulligan-mode"
            label={t("draw_simulator.mulligan_mode")}
            checked={state.mulliganMode}
            onCheckedChange={toggleMulligan}
          />
        </DefaultTooltip>
      </div>
      <nav className={css["nav"]}>
        {ancestralKnowledge && (
          <AncestralKnowledgeButton
            attachedSkills={attachedSkills}
            card={ancestralKnowledge}
            locked={state.ancestralKnowledgeLocked}
            onClick={attachAncestralKnowledge}
          />
        )}
        {[1, 2, 5].map((count) => (
          <Button
            key={count}
            size="sm"
            onClick={() => drawAmount(count)}
            tooltip={t("draw_simulator.draw_tooltip", {
              count,
              cards: t("common.card", { count }),
            })}
          >
            {count}
          </Button>
        ))}
        <Button
          size="sm"
          onClick={reset}
          tooltip={t("draw_simulator.reset_tooltip")}
        >
          {t("draw_simulator.reset")}
        </Button>
        <Button
          size="sm"
          disabled={!state.selection.length}
          onClick={redraw}
          tooltip={t("draw_simulator.redraw_tooltip")}
        >
          {t("draw_simulator.redraw")}
        </Button>
        <Button
          size="sm"
          disabled={!state.selection.length}
          onClick={reshuffle}
          tooltip={t("draw_simulator.reshuffle_tooltip")}
        >
          {t("draw_simulator.reshuffle")}
        </Button>
      </nav>
      {!isEmpty(state.drawn) && (
        <ol className={css["drawn"]}>
          {state.drawn.map((code, index) => {
            if (!deck.cards.slots[code]) return null;
            return (
              <DrawSimulatorCard
                // oxlint-disable-next-line react/no-array-index-key -- duplicate cards need the draw position to distinguish them.
                key={`${index}-${code}`}
                card={deck.cards.slots[code].card}
                index={index}
                state={state}
                dispatch={dispatch}
              />
            );
          })}
        </ol>
      )}
    </Plane>
  );
}

type AncestralKnowledgeButtonProps = {
  attachedSkills: Card[];
  card: Card;
  locked: boolean;
  onClick: () => void;
};

function AncestralKnowledgeButton(props: AncestralKnowledgeButtonProps) {
  const { attachedSkills, card, locked, onClick } = props;

  return (
    <Popover clickDisabled placement="bottom-start">
      <PopoverTrigger asChild>
        <Button size="sm" onClick={onClick}>
          {locked && <LockIcon className={css["ancestral-knowledge-locked"]} />}
          {displayAttribute(card, "name")}{" "}
          <span className={css["ancestral-knowledge-count"]}>
            {attachedSkills.length}
          </span>
        </Button>
      </PopoverTrigger>
      {!!attachedSkills.length && (
        <PopoverContent>
          <Plane className={css["ancestral-knowledge-popover"]}>
            <ol className={css["ancestral-knowledge-cards"]}>
              {attachedSkills.map((skill, index) => (
                <ListCard
                  as="li"
                  card={skill}
                  disableModalOpen
                  // oxlint-disable-next-line react/no-array-index-key -- duplicate cards need their attachment position to distinguish them.
                  key={`${index}-${skill.code}`}
                  size="sm"
                />
              ))}
            </ol>
          </Plane>
        </PopoverContent>
      )}
    </Popover>
  );
}

type DrawSimulatorCardProps = {
  index: number;
  state: State;
  card: Card;
  dispatch: React.Dispatch<Action>;
};

function DrawSimulatorCard(props: DrawSimulatorCardProps) {
  const { card, dispatch, index, state } = props;

  const {
    refs: { setFloating, setReference },
    referenceProps,
    isMounted,
    floatingStyles,
    transitionStyles,
  } = useRestingTooltip({ delay: 350 });

  return (
    <li className={css["drawn-card"]}>
      <button
        {...referenceProps}
        ref={setReference}
        className={cx(
          css["card-toggle"],
          state.selection.includes(index) && css["selected"],
        )}
        onClick={() => dispatch({ type: "select", index })}
        type="button"
      >
        <CardScan card={card} preventFlip draggable={false} />
      </button>
      {isMounted && (
        <PortaledCardTooltip
          card={card}
          ref={setFloating}
          floatingStyles={floatingStyles}
          transitionStyles={transitionStyles}
        />
      )}
    </li>
  );
}

// Reducer

type InitAction = {
  type: "init";
  deck: ResolvedDeck;
};

type AttachAncestralKnowledgeAction = {
  type: "attachAncestralKnowledge";
  deck: ResolvedDeck;
};

type DrawAction = {
  type: "draw";
  amount: number;
  deck: ResolvedDeck;
};

type ReshuffleAction = {
  type: "reshuffle";
};

type RedrawAction = {
  type: "redraw";
  deck: ResolvedDeck;
};

type ResetAction = {
  type: "reset";
  deck: ResolvedDeck;
};

type SelectAction = {
  type: "select";
  index: number;
};

type ToggleMulliganAction = {
  type: "toggleMulligan";
};

type Action =
  | AttachAncestralKnowledgeAction
  | DrawAction
  | InitAction
  | ReshuffleAction
  | RedrawAction
  | ResetAction
  | SelectAction
  | ToggleMulliganAction;

type State = {
  ancestralKnowledge: string[];
  ancestralKnowledgeLocked: boolean;
  bag: string[];
  drawn: string[];
  selection: number[];
  deckId: Id;
  mulliganMode: boolean;
};

function initialState(deck: ResolvedDeck): State {
  const bag = prepareBag(deck);

  return drawReducer(
    {
      ancestralKnowledge: [],
      ancestralKnowledgeLocked: false,
      bag,
      drawn: [],
      selection: [],
      deckId: deck.id,
      mulliganMode: true,
    },
    {
      type: "init",
      deck,
    },
  );
}

function shouldAutoRedrawInMulligan(card: Card): boolean {
  return (
    (card.subtype_code === "weakness" ||
      card.subtype_code === "basicweakness") &&
    !card.sticky_mulligan
  );
}

function drawReducer(state: State, action: Action): State {
  switch (action.type) {
    case "init": {
      if (state.deckId === action.deck.id) return state;
      const bag = prepareBag(action.deck);
      return {
        ...state,
        ancestralKnowledge: [],
        ancestralKnowledgeLocked: false,
        bag,
        deckId: action.deck.id,
        drawn: [],
        selection: [],
      };
    }

    case "reset": {
      return {
        ...state,
        ancestralKnowledge: [],
        ancestralKnowledgeLocked: false,
        bag: prepareBag(action.deck),
        deckId: action.deck.id,
        drawn: [],
        mulliganMode: state.mulliganMode,
        selection: [],
      };
    }

    case "attachAncestralKnowledge": {
      if (state.ancestralKnowledgeLocked) return state;

      const shuffledBag = shuffle([...state.bag, ...state.ancestralKnowledge]);
      const ancestralKnowledge = [];
      const bag = [];

      for (const code of shuffledBag) {
        const card = action.deck.cards.slots[code]?.card;

        if (
          ancestralKnowledge.length < 5 &&
          card?.type_code === "skill" &&
          card.subtype_code == null
        ) {
          ancestralKnowledge.push(code);
        } else {
          bag.push(code);
        }
      }

      return { ...state, ancestralKnowledge, bag };
    }

    case "draw": {
      if (!state.mulliganMode) {
        const cards = state.bag.slice(0, action.amount);

        return {
          ...state,
          ancestralKnowledgeLocked:
            state.ancestralKnowledgeLocked || cards.length > 0,
          bag: state.bag.slice(action.amount),
          drawn: [...state.drawn, ...cards],
        };
      }

      const drawn = [...state.drawn];
      const bag = [...state.bag];

      const toReturn = [];

      let drawsRemaining = action.amount;

      while (drawsRemaining > 0 && bag.length > 0) {
        const code = bag.shift();
        if (!code) break;

        const card = action.deck.cards.slots[code].card;

        if (card && shouldAutoRedrawInMulligan(card)) {
          toReturn.push(code);
        } else {
          drawn.push(code);
          drawsRemaining--;
        }
      }

      bag.push(...toReturn);

      return {
        ...state,
        ancestralKnowledgeLocked:
          state.ancestralKnowledgeLocked || drawn.length > state.drawn.length,
        bag,
        drawn,
      };
    }

    case "redraw": {
      const codes = state.drawn.filter((_, index) =>
        state.selection.includes(index),
      );

      const bag = [...state.bag, ...shuffle(codes)];
      const replacements = [];

      if (!state.mulliganMode) {
        replacements.push(...bag.splice(0, codes.length));

        return {
          ...state,
          bag,
          drawn: replaceSelectedCards(
            state.drawn,
            state.selection,
            replacements,
          ),
          selection: [],
        };
      }

      let drawsRemaining = codes.length;

      const toReturn = [];

      while (drawsRemaining > 0 && bag.length > 0) {
        const code = bag.shift();
        if (!code) break;

        const card = action.deck.cards.slots[code].card;

        if (card && shouldAutoRedrawInMulligan(card)) {
          toReturn.push(code);
        } else {
          replacements.push(code);
          drawsRemaining--;
        }
      }

      bag.push(...toReturn);

      return {
        ...state,
        bag,
        drawn: replaceSelectedCards(state.drawn, state.selection, replacements),
        selection: [],
      };
    }

    case "reshuffle": {
      const codes = state.drawn.filter((_, index) =>
        state.selection.includes(index),
      );

      const bag = shuffle([...state.bag, ...codes]);

      const drawn = state.drawn.filter(
        (_, index) => !state.selection.includes(index),
      );

      return { ...state, bag, drawn, selection: [] };
    }

    case "select": {
      return {
        ...state,
        selection: state.selection.includes(action.index)
          ? state.selection.filter((i) => i !== action.index)
          : [...state.selection, action.index],
      };
    }

    case "toggleMulligan": {
      return {
        ...state,
        bag: shuffle(state.bag),
        mulliganMode: !state.mulliganMode,
      };
    }
  }
}

function replaceSelectedCards(
  drawn: string[],
  selection: number[],
  replacements: string[],
) {
  const selectedIndices = new Set(selection);
  let replacementIndex = 0;

  return drawn.flatMap((code, index) => {
    if (!selectedIndices.has(index)) return [code];

    const replacement = replacements.at(replacementIndex);
    replacementIndex++;

    return replacement ? [replacement] : [];
  });
}

function prepareBag(deck: ResolvedDeck) {
  const cards = [];

  const attachedQuantities = Object.values(deck.attachments ?? {}).reduce(
    (acc, curr) => {
      for (const [code, qty] of Object.entries(curr)) {
        acc[code] ??= 0;
        acc[code] += qty;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  for (const { card } of Object.values(deck.cards.slots)) {
    const drawable =
      !card.permanent &&
      !card.double_sided &&
      !card.back_link_id &&
      !card.starts_in_play &&
      !card.starts_in_hand &&
      card.code !== SPECIAL_CARD_CODES.ON_THE_MEND;

    if (!drawable) {
      continue;
    }

    const quantity =
      (deck.slots[card.code] ?? 0) - (attachedQuantities[card.code] ?? 0);

    if (quantity > 0) {
      for (const _ of range(0, quantity)) {
        cards.push(card.code);
      }
    }
  }

  shuffle(cards);
  return cards;
}
