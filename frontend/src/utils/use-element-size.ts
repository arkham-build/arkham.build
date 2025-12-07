import { useEffect, useState } from "react";

export function useElementSize(
  ref: React.MutableRefObject<HTMLElement | null>,
): { width: number; height: number } {
  const [size, setSize] = useState({
    width: ref.current?.offsetWidth ?? 0,
    height: ref.current?.offsetHeight ?? 0,
  });

  useEffect(() => {
    const updateSize = () => {
      if (ref.current) {
        setSize({
          width: ref.current.offsetWidth,
          height: ref.current.offsetHeight,
        });
      }
    };

    window.addEventListener("resize", updateSize, { passive: true });
    updateSize();

    return () => window.removeEventListener("resize", updateSize);
  }, [ref.current]);

  return size;
}
