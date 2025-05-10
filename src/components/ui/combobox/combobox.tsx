import type { Coded } from "@/store/services/queries.types";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
import { cx } from "@/utils/cx";
import { isEmpty } from "@/utils/is-empty";
import { normalizeDiacritics } from "@/utils/normalize-diacritics";
import {
  FloatingFocusManager,
  FloatingPortal,
  type FloatingPortalProps,
  autoUpdate,
  flip,
  offset,
  size,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import uFuzzy from "@leeoniya/ufuzzy";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ComboboxMenu } from "./combobox-menu";
import { ComboboxResults } from "./combobox-results";
import css from "./combobox.module.css";

function defaultItemToString<T extends Coded>(val: T) {
  return val.code.toLowerCase();
}

function defaultRenderer<T extends Coded>(val: T) {
  return val.code;
}

function fuzzyMatch<T extends Coded>(
  search: string,
  items: T[],
  itemToString: (item: T) => string,
) {
  if (!search) return items;

  const normalizedSearchTerm = normalizeDiacritics(search);

  const uf = new uFuzzy();

  // Normalize diacritics in search items to stripped letters
  const searchItems = items.map((item) =>
    normalizeDiacritics(itemToString(item)),
  );

  const results = uf.search(searchItems, normalizedSearchTerm, 1);
  if (!results?.[0]) return items;

  const matches = results[0].reduce<Record<string, boolean>>((acc, curr) => {
    acc[curr] = true;
    return acc;
  }, {});

  return items.filter((_, i) => matches[i]);
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
  limit?: number;
  omitItemPadding?: boolean;
  onValueChange?: (value: string[]) => void;
  onEscapeBlur?: () => void;
  placeholder?: string;
  readonly?: boolean;
  renderItem?: (item: T) => React.ReactNode;
  renderResult?: (item: T) => React.ReactNode;
  showLabel?: boolean;
  selectedItems: string[];
};

// TODO: the logic here is very messy, extract to a reducer when adding group support.
// TODO: there is a nasty edge case here where the combobox has a selected item which
// is not in present in the items list. In this case, the item will not be shown.
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
    () => fuzzyMatch(inputValue, items, itemToString),
    [items, inputValue, itemToString],
  );

  const setSelectedItem = useCallback(
    (item: T) => {
      const next = [...selectedItems];
      const idx = selectedItems.indexOf(item.code);

      if (idx === -1) {
        next.push(item.code);
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
    (item: T) => {
      setSelectedItem(item);
    },
    [setSelectedItem],
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
    <div className={cx(css["combobox"], className)}>
      {!readonly && (
        <div className={css["control"]}>
          <label
            className={cx(css["control-label"], !showLabel && "sr-only")}
            htmlFor={id}
          >
            {label}
          </label>
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
        </div>
      )}
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
          items={items.filter((x) => selectedItems.includes(x.code))}
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
    <FloatingPortal id={FLOATING_PORTAL_ID} {...props}>
      {props.children}
    </FloatingPortal>
  );
}
