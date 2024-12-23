import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { ListLayoutNoSidebar } from "@/layouts/list-layout-no-sidebar";
import { useStore } from "@/store";
import type { Card } from "@/store/services/queries.types";
import { useEffect } from "react";
import { useParams } from "wouter";
import { Error404 } from "../errors/404";

type Props = {
  code: string;
};

function UsableCards() {
  const params = useParams<Props>();

  const card = useStore((state) => state.metadata.cards[params.code]);

  if (!card || card.type_code !== "investigator") {
    return <Error404 />;
  }

  return <UsableCardsList card={card} />;
}

function UsableCardsList(props: { card: Card }) {
  const { card } = props;
  const listKey = `investigator_usable_${card.code}`;

  const activeList = useStore((state) => state.lists[state.activeList ?? ""]);
  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);
  const removeList = useStore((state) => state.removeList);

  useEffect(() => {
    addList(listKey, "player", {
      investigator: card.code,
    });

    setActiveList(listKey);

    return () => {
      removeList(listKey);
      setActiveList(undefined);
    };
  }, [addList, removeList, setActiveList, listKey, card.code]);

  if (!activeList) return null;

  return (
    <ListLayoutContextProvider>
      <ListLayoutNoSidebar
        titleString={`Cards usable by ${card.parallel ? "Parallel " : ""}${card.real_name}`}
        title={
          <>
            Cards usable by{" "}
            {card.parallel ? (
              <>
                <i className="icon-parallel" />{" "}
              </>
            ) : (
              ""
            )}
            {card.real_name}
          </>
        }
      />
    </ListLayoutContextProvider>
  );
}

export default UsableCards;
