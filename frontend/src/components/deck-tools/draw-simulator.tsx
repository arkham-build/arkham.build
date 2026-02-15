import type { Card } from "@arkham-build/shared";
import { ShuffleIcon } from "lucide-react";
import { useCallback, useReducer } from "react";
import { useTranslation } from "react-i18next";
import type { ResolvedDeck } from "@/store/lib/types";
import type { Id } from "@/store/schemas/deck.schema";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { cx } from "@/utils/cx";
import { isEmpty } from "@/utils/is-empty";
import { range } from "@/utils/range";
import { shuffle } from "@/utils/shuffle";
import { CardScan } from "../card-scan";
import { PortaledCardTooltip } from "../card-tooltip/card-tooltip-portaled";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Plane } from "../ui/plane";
import { DefaultTooltip } from "../ui/tooltip";
import { useRestingTooltip } from "../ui/tooltip.hooks";
import css from "./draw-simulator.module.css";

type Props = {
  deck: ResolvedDeck;
};

type DrawSimulatorCardProps = {
  index: number;
  state: State;
  card: Card;
  dispatch: React.Dispatch<Action>;
};

function DrawSimulatorCard(props: DrawSimulatorCardProps) {
  const { card, dispatch, index, state } = props;

  const { refs, referenceProps, isMounted, floatingStyles, transitionStyles } =
    useRestingTooltip({ delay: 350 });

  return (
    <li className={css["card"]}>
      <button
        {...referenceProps}
        ref={refs.setReference}
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
          ref={refs.setFloating}
          floatingStyles={floatingStyles}
          transitionStyles={transitionStyles}
        />
      )}
    </li>
  );
}

export function DrawSimulator(props: Props) {
  const { deck } = props;

  const { t } = useTranslation();

  const [state, dispatch] = useReducer(drawReducer, initialState(deck));

  const drawAmount = useCallback(
    (count: number) => {
      dispatch({ type: "draw", amount: count, deck });
    },
    [deck],
  );

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  const reshuffle = useCallback(() => {
    dispatch({ type: "reshuffle" });
  }, []);

  const redraw = useCallback(() => {
    dispatch({ type: "redraw", deck });
  }, [deck]);

  const toggleMulligan = useCallback(() => {
    dispatch({ type: "toggleMulligan" });
  }, []);

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
          {state.drawn.map((code, index) => (
            <DrawSimulatorCard
              key={`${index}-${code}`}
              card={deck.cards.slots[code].card}
              index={index}
              state={state}
              dispatch={dispatch}
            />
          ))}
        </ol>
      )}
    </Plane>
  );
}

type InitAction = {
  type: "init";
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
};

type SelectAction = {
  type: "select";
  index: number;
};

type ToggleMulliganAction = {
  type: "toggleMulligan";
};

type Action =
  | DrawAction
  | InitAction
  | ReshuffleAction
  | RedrawAction
  | ResetAction
  | SelectAction
  | ToggleMulliganAction;

type State = {
  bag: string[];
  drawn: string[];
  selection: number[];
  deckId: Id;
  mulliganMode: boolean;
};

function initialState(deck: ResolvedDeck): State {
  const bag = prepareBag(deck);

  return drawReducer(
    { bag, drawn: [], selection: [], deckId: deck.id, mulliganMode: true },
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
      return { ...state, bag, drawn: [], selection: [] };
    }

    case "reset": {
      return {
        ...state,
        bag: shuffle([...state.bag, ...state.drawn]),
        drawn: [],
        mulliganMode: state.mulliganMode,
        selection: [],
      };
    }

    case "draw": {
      if (!state.mulliganMode) {
        return {
          ...state,
          bag: state.bag.slice(action.amount),
          drawn: [...state.drawn, ...state.bag.slice(0, action.amount)],
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
        bag,
        drawn,
      };
    }

    case "redraw": {
      const codes = state.drawn.filter((_, index) =>
        state.selection.includes(index),
      );

      const bag = [...state.bag, ...shuffle(codes)];

      const drawn = state.drawn.filter(
        (_, index) => !state.selection.includes(index),
      );

      if (!state.mulliganMode) {
        for (const _ of range(0, codes.length)) {
          // biome-ignore lint/style/noNonNullAssertion: we extend the bag for each draw, so this is safe.
          drawn.push(bag.shift()!);
        }

        return { ...state, bag, drawn, selection: [] };
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
          drawn.push(code);
          drawsRemaining--;
        }
      }

      bag.push(...toReturn);

      return {
        ...state,
        bag,
        drawn,
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

function prepareBag(deck: ResolvedDeck) {
  const cards = Object.values(deck.cards.slots).reduce((acc, { card }) => {
    const drawable =
      !card.permanent &&
      !card.double_sided &&
      !card.back_link_id &&
      !card.starts_in_play &&
      !card.starts_in_hand &&
      card.code !== SPECIAL_CARD_CODES.ON_THE_MEND &&
      Object.entries(deck.attachments ?? {}).every(
        ([_, attached]) => !attached?.[card.code],
      );

    if (drawable) {
      const quantity = deck.slots[card.code] ?? 0;
      for (const _ of range(0, quantity)) {
        acc.push(card.code);
      }
    }

    return acc;
  }, [] as string[]);

  shuffle(cards);

  return cards;
}
