import { useEffect, useRef } from "react";
import { cx } from "@/utils/cx";
import { mergeRefs } from "@/utils/merge-refs";
import { getScrollParent } from "@/utils/scroll-parent";
import css from "./auto-sizing-textarea.module.css";

type TextareaProps = React.HTMLProps<HTMLTextAreaElement>;

export function AutoSizingTextarea(props: TextareaProps) {
  const { className, onChange, ref: forwardedRef, ...textareaProps } = props;
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

  const onValueChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = event.target;

    const scrollParent = getScrollParent(target);

    const scrollPosition =
      scrollParent instanceof Element ? scrollParent.scrollTop : undefined;

    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
    onChange?.(event);

    if (scrollParent instanceof Element) {
      scrollParent.scrollTop = scrollPosition ?? 0;
    }
  };

  return (
    <textarea
      {...textareaProps}
      className={cx(css["textarea"], className)}
      onChange={onValueChange}
      ref={mergeRefs(ref, forwardedRef)}
    />
  );
}
