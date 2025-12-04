import { createSelectorCreator, lruMemoize } from "reselect";

export const createDebugSelector = createSelectorCreator(lruMemoize, {
  equalityCheck: (previousVal, currentVal) => {
    const rv = currentVal === previousVal;
    if (!rv)
      console.log("Selector param value changed: ", previousVal, currentVal);
    return rv;
  },
});
