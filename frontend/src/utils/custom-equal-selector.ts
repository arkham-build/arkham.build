import { createSelectorCreator, lruMemoize } from "reselect";

export const createDebugSelector = createSelectorCreator(lruMemoize, {
  equalityCheck: (previousVal, currentVal) => {
    const rv = currentVal === previousVal;
    if (!rv) {
      console.debug("Selector param value changed: ", previousVal, currentVal);
    }
    return rv;
  },
});
