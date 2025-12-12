import {
  autoUpdate,
  FloatingFocusManager,
  FloatingPortal,
  type FloatingPortalProps,
  flip,
  offset,
  size,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Coded } from "@/store/lib/types";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
import { cx } from "@/utils/cx";
import { fuzzyMatch, prepareNeedle } from "@/utils/fuzzy";
import { isEmpty } from "@/utils/is-empty";
import css from "./combobox.module.css";
import { ComboboxMenu } from "./combobox-menu";
import { ComboboxResults } from "./combobox-results";

function defaultItemToString<T extends Coded>(val: T) {
  return val.code.toLowerCase();
}

function defaultRenderer<T extends Coded>(val: T) {
  return val.code;
}

function fuzzy<T extends Coded>(
  search: string,
  items: T[],
  itemToString: (item: T) => string,
) {
  const needle = prepareNeedle(search);
  if (!search) return items;
  if (!needle) return items;

  return items.filter((item) => {
    const haystack = itemToString(item);
    return fuzzyMatch([haystack], needle);
  });
}

export type Props<T extends Coded> = {
  autoFocus?: boolean;
  className?: string;
  defaultOpen?: boolean;
  disabled?: boolean;
  omitFloatingPortal?: boolean;
  id: string;
  items: T[];
  itemToString?: (item: T) => string;
  label: React.ReactNode;
  locale: string;
  limit?: number;
  omitItemPadding?: boolean;
  onValueChange?: (value: T[]) => void;
  onEscapeBlur?: () => void;
  placeholder?: string;
  readonly?: boolean;
  renderItem?: (item: T) => React.ReactNode;
  renderResult?: (item: T) => React.ReactNode;
  showLabel?: boolean;
  selectedItems: (T | undefined)[];
};

// TODO: the logic here is very messy, extract to a reducer when adding group support.
export function Combobox<T extends Coded>(props: Props<T>) {
  const {
    autoFocus,
    className,
    defaultOpen,
    disabled,
    id,
    items,
    itemToString = defaultItemToString,
    label,
    limit,
    placeholder,
    omitItemPadding,
    onValueChange,
    onEscapeBlur,
    readonly,
    renderItem = defaultRenderer,
    renderResult = defaultRenderer,
    selectedItems,
    showLabel,
    omitFloatingPortal,
  } = props;

  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [isOpen, setOpen] = useState(defaultOpen);
  const [inputValue, setInputValue] = useState("");

  const { context, refs, floatingStyles } = useFloating({
    whileElementsMounted: autoUpdate,
    placement: "bottom-start",
    open: isOpen,
    middleware: [
      flip(),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            minWidth: `${rects.reference.width}px`,
          });
        },
      }),
      offset(5),
    ],
    onOpenChange: setOpen,
  });

  const listRef = useRef<HTMLElement[]>([]);

  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  const filteredItems = useMemo(
    () => fuzzy(inputValue, items, itemToString),
    [items, inputValue, itemToString],
  );

  const setSelectedItem = useCallback(
    (item: T) => {
      const next = [...selectedItems] as T[];

      const idx = next.findIndex((s) => s.code === item.code);

      if (idx === -1) {
        next.push(item);
      } else {
        next.splice(idx, 1);
      }

      onValueChange?.(next);

      if (limit && next.length >= limit) {
        setOpen(false);
      }

      const ref = refs.reference.current;

      if (ref instanceof HTMLInputElement) {
        setInputValue("");
        if (ref && document.activeElement !== ref) {
          ref.focus();
        }
      }
    },
    [refs.reference, onValueChange, selectedItems, limit],
  );

  const removeSelectedItem = useCallback(
    (index: number) => {
      const next = [...selectedItems] as T[];
      next.splice(index, 1);
      onValueChange?.(next);
    },
    [selectedItems, onValueChange],
  );

  useEffect(() => {
    listRef.current = [];
    setActiveIndex(filteredItems.length > 0 ? 0 : undefined);
  }, [filteredItems.length]);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
    } else {
      setActiveIndex(undefined);
    }
  }, [isOpen]);

  return (
    <div className={cx(css["combobox"], className)} data-testid={id}>
      <div className={cx(css["control"], !showLabel && readonly && "sr-only")}>
        <label
          className={cx(css["control-label"], !showLabel && "sr-only")}
          htmlFor={id}
        >
          {label}
        </label>
        {!readonly && (
          <div className={css["control-row"]}>
            <input
              autoComplete="off"
              data-testid="combobox-input"
              ref={refs.setReference}
              {...getReferenceProps({
                id,
                className: css["control-input"],
                disabled:
                  disabled || (!!limit && selectedItems.length >= limit),
                type: "text",
                value: inputValue,
                placeholder: placeholder,
                autoFocus,
                onKeyDown(evt) {
                  if (evt.key === "Tab") {
                    // use a timeout to allow focus to move natively first.
                    // re-rendering the FloatingPortal first causes the focus to stay on input.
                    setTimeout(() => setOpen(false));
                  } else if (evt.key === "Escape") {
                    evt.preventDefault();
                    setOpen(false);
                    (evt.target as HTMLInputElement)?.blur();
                    onEscapeBlur?.();
                  } else if (evt.key === "Enter" && activeIndex != null) {
                    evt.preventDefault();
                    const activeItem = filteredItems[activeIndex];
                    if (activeItem) {
                      setSelectedItem(activeItem);
                      setOpen(false);
                    }
                  } else if (evt.key === "ArrowDown") {
                    evt.preventDefault();
                    setActiveIndex((prev) => {
                      if (activeIndex == null || prev == null) return 0;
                      return prev < filteredItems.length - 1 ? prev + 1 : prev;
                    });
                    if (!isOpen) setOpen(true);
                  } else if (evt.key === "ArrowUp") {
                    evt.preventDefault();
                    setActiveIndex((prev) => {
                      if (prev == null) return 0;
                      return prev > 0 ? prev - 1 : prev;
                    });
                    if (!isOpen) setOpen(true);
                  } else if (
                    !isOpen &&
                    !evt.metaKey &&
                    !evt.altKey &&
                    evt.key !== "Backspace" &&
                    evt.key !== "Shift"
                  ) {
                    setOpen(true);
                  }
                },
                onClick() {
                  setOpen(!isOpen);
                },
                onChange(evt) {
                  if (evt.target instanceof HTMLInputElement) {
                    setInputValue(evt.target.value);
                  }
                },
                onPaste() {
                  setOpen(true);
                },
              })}
            />
            {isOpen ? (
              <ChevronUpIcon className={css["control-indicator"]} />
            ) : (
              <ChevronDownIcon className={css["control-indicator"]} />
            )}
          </div>
        )}
      </div>
      {!readonly && isOpen && (
        <ToggleableFloatingPortal enabled={!omitFloatingPortal}>
          <FloatingFocusManager context={context} initialFocus={-1}>
            <div
              className={css["menu"]}
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps({
                ref: refs.setFloating,
              })}
            >
              <ComboboxMenu
                activeIndex={activeIndex}
                items={filteredItems}
                listRef={listRef}
                omitItemPadding={omitItemPadding}
                renderItem={renderItem}
                selectedItems={selectedItems}
                setActiveIndex={setActiveIndex}
                setSelectedItem={setSelectedItem}
              />
            </div>
          </FloatingFocusManager>
        </ToggleableFloatingPortal>
      )}
      {!isEmpty(selectedItems) && (
        <ComboboxResults
          items={selectedItems}
          onRemove={readonly ? undefined : removeSelectedItem}
          renderResult={renderResult}
        />
      )}
    </div>
  );
}

function ToggleableFloatingPortal(
  props: FloatingPortalProps & {
    enabled?: boolean;
  },
) {
  if (!props.enabled) return props.children;
  return (
    <FloatingPortal preserveTabOrder id={FLOATING_PORTAL_ID} {...props}>
      {props.children}
    </FloatingPortal>
  );
}
