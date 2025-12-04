import { forwardRef, useCallback, useEffect, useRef } from "react";
import { cx } from "@/utils/cx";
import { mergeRefs } from "@/utils/merge-refs";
import { getScrollParent } from "@/utils/scroll-parent";
import css from "./auto-sizing-textarea.module.css";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const AutoSizingTextarea = forwardRef(function AutoSizingTextarea(
  props: TextareaProps,
  forwardedRef: React.ForwardedRef<HTMLTextAreaElement>,
) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      const target = ref.current;
      if (target) {
        target.style.height = "auto";
        target.style.height = `${target.scrollHeight}px`;
      }
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  const onValueChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const target = event.target;

      const scrollParent = getScrollParent(target);

      const scrollPosition =
        scrollParent instanceof Element ? scrollParent.scrollTop : undefined;

      target.style.height = "auto";
      target.style.height = `${target.scrollHeight}px`;
      props.onChange?.(event);

      if (scrollParent instanceof Element) {
        scrollParent.scrollTop = scrollPosition ?? 0;
      }
    },
    [props.onChange],
  );

  return (
    <textarea
      {...props}
      className={cx(css["textarea"], props.className)}
      onChange={onValueChange}
      ref={mergeRefs(ref, forwardedRef)}
    />
  );
});
