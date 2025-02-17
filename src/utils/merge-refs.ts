import type { Ref } from "react";

export function mergeRefs<T = VoidFunction>(
  ...refs: (Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (value) => {
    // biome-ignore lint/complexity/noForEach: <explanation>
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}
