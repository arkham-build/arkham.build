import { useCallback, useEffect, useReducer, useRef } from "react";

type StateInitial = {
  error: undefined;
  data: undefined;
  state: "initial";
};

type StateLoading = {
  error: undefined;
  data: undefined;
  state: "loading";
};

type StateSuccess<T> = {
  error: undefined;
  data: T;
  state: "success";
};

type StateError = {
  error: unknown;
  data: undefined;
  state: "error";
};

export type QueryState<T> =
  | StateLoading
  | StateError
  | StateSuccess<T>
  | StateInitial;

type Action<T> =
  | { type: "LOADING" }
  | { type: "SUCCESS"; payload: T }
  | { type: "ERROR"; payload: unknown }
  | { type: "RESET" };

function reducer<T>(_: QueryState<T>, action: Action<T>): QueryState<T> {
  switch (action.type) {
    case "LOADING":
      return { error: undefined, data: undefined, state: "loading" };
    case "SUCCESS":
      return { error: undefined, state: "success", data: action.payload };
    case "ERROR":
      return { data: undefined, state: "error", error: action.payload };
    case "RESET":
      return { error: undefined, data: undefined, state: "initial" };
  }
}

type Query<T> = () => Promise<T>;

export function useQuery<T>(query: Query<T> | undefined): QueryState<T> {
  const [state, dispatch] = useReducer(reducer<T>, {
    state: "initial",
    error: undefined,
    data: undefined,
  } as QueryState<T>);

  // Lock to prevent re-running the same query multiple times while it's already running.
  const lock = useRef<null | Query<T>>(null);

  // Keep a reference of the current query version we are running.
  // If it changes between the time we start the query and the time it resolves,
  // we ignore the result.
  const queryId = useRef(0);

  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const doQuery = useCallback(async () => {
    if (!query) {
      dispatch({ type: "RESET" });
      return;
    }

    if (!lock.current || query !== lock.current) {
      lock.current = query;

      dispatch({ type: "LOADING" });

      queryId.current += 1;
      const currentQueryId = queryId.current;

      try {
        const data = await query();

        if (isMounted && queryId.current === currentQueryId) {
          dispatch({ type: "SUCCESS", payload: data });
        }
      } catch (err) {
        if (isMounted && queryId.current === currentQueryId) {
          dispatch({ type: "ERROR", payload: err });
        }
      } finally {
        lock.current = null;
      }
    }
  }, [query]);

  useEffect(() => {
    doQuery();
  }, [doQuery]);

  return state;
}

export function useMutate<T>(query: Query<T>): QueryState<T> & {
  mutate: () => Promise<void>;
} {
  const [state, dispatch] = useReducer(reducer<T>, {
    state: "initial",
    error: undefined,
    data: undefined,
  } as QueryState<T>);

  const mutate = useCallback(async () => {
    dispatch({ type: "LOADING" });
    try {
      const data = await query();
      dispatch({ type: "SUCCESS", payload: data });
    } catch (err) {
      dispatch({ type: "ERROR", payload: err });
      throw err;
    }
  }, [query]);

  return {
    ...state,
    mutate,
  };
}
