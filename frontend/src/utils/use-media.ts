import { useEffect, useState } from "react";

function getInitialState(query: string, defaultState?: boolean) {
  return defaultState !== undefined
    ? defaultState
    : window.matchMedia(query).matches;
}

export function useMedia(query: string, defaultState?: boolean) {
  const [state, setState] = useState(getInitialState(query, defaultState));

  useEffect(() => {
    let mounted = true;
    const mql = window.matchMedia(query);
    const onChange = () => {
      if (!mounted) {
        return;
      }
      setState(!!mql.matches);
    };

    mql.addEventListener("change", onChange);
    setState(mql.matches);

    return () => {
      mounted = false;
      mql.removeEventListener("change", onChange);
    };
  }, [query]);

  return state;
}
