import { Button } from "../ui/button";
import { Plane } from "../ui/plane";

import type { ResolvedDeck } from "@/store/lib/types";
import { cx } from "@/utils/cx";
import { isEmpty } from "@/utils/is-empty";
import { range } from "@/utils/range";
import { shuffle } from "@/utils/shuffle";
import { ShuffleIcon } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CardScan } from "../card-scan";
import css from "./draw-simulator.module.css";

import type { Card } from "@/store/services/queries.types";
import { PortaledCardTooltip } from "../card-tooltip/card-tooltip-portaled";
import { useRestingTooltip } from "../ui/tooltip.hooks";

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
    useRestingTooltip();

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
        <CardScan card={card} preventFlip />
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

  const mounted = useRef(false);
  const [state, dispatch] = useReducer(drawReducer, initialState(deck));

  const init = useCallback(() => {
    dispatch({ type: "init", deck });
  }, [deck]);

  useEffect(() => {
    if (mounted.current) {
      init();
    } else {
      mounted.current = true;
    }
  }, [init]);

  const drawAmount = useCallback((count: number) => {
    dispatch({ type: "draw", amount: count });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  const reshuffle = useCallback(() => {
    dispatch({ type: "reshuffle" });
  }, []);

  const redraw = useCallback(() => {
    dispatch({ type: "redraw" });
  }, []);

  return (
    <Plane className={css["container"]} as="article">
      <header className={css["header"]}>
        <h4 className={cx(css["title"])}>
          <ShuffleIcon /> {t("draw_simulator.title")}
        </h4>
      </header>
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
};

type ReshuffleAction = {
  type: "reshuffle";
};

type RedrawAction = {
  type: "redraw";
};

type ResetAction = {
  type: "reset";
};

type SelectAction = {
  type: "select";
  index: number;
};

type Action =
  | DrawAction
  | InitAction
  | ReshuffleAction
  | RedrawAction
  | ResetAction
  | SelectAction;

type State = {
  bag: string[];
  drawn: string[];
  selection: number[];
};

function initialState(deck: ResolvedDeck): State {
  const bag = prepareBag(deck);
  return { bag, drawn: [], selection: [] };
}

function drawReducer(state: State, action: Action): State {
  switch (action.type) {
    case "init": {
      const bag = prepareBag(action.deck);
      return { ...state, bag, drawn: [], selection: [] };
    }

    case "reset": {
      return {
        ...state,
        bag: shuffle([...state.bag, ...state.drawn]),
        drawn: [],
        selection: [],
      };
    }

    case "draw": {
      return {
        ...state,
        bag: state.bag.slice(action.amount),
        drawn: [...state.drawn, ...state.bag.slice(0, action.amount)],
      };
    }

    case "redraw": {
      const codes = shuffle(
        state.drawn.filter((_, index) => state.selection.includes(index)),
      );

      const drawn = [...state.drawn];
      const bag = [...state.bag, ...codes];

      for (const index of state.selection) {
        // biome-ignore lint/style/noNonNullAssertion: we extend the bag for each draw, so this is safe.
        drawn.splice(index, 1, bag.shift()!);
      }

      return { bag, drawn, selection: [] };
    }

    case "reshuffle": {
      const codes = state.drawn.filter((_, index) =>
        state.selection.includes(index),
      );

      const bag = shuffle([...state.bag, ...codes]);

      const drawn = [...state.drawn];

      for (const index of state.selection) {
        drawn.splice(index, 1);
      }

      return { bag, drawn, selection: [] };
    }

    case "select": {
      return {
        ...state,
        selection: state.selection.includes(action.index)
          ? state.selection.filter((i) => i !== action.index)
          : [...state.selection, action.index],
      };
    }
  }
}

function prepareBag(deck: ResolvedDeck) {
  const cards = Object.values(deck.cards.slots).reduce((acc, { card }) => {
    if (!card.permanent && !card.double_sided && !card.back_link_id) {
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
