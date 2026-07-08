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
import { useTranslation } from "react-i18next";
import type { Coded } from "@/store/lib/types";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
import { cx } from "@/utils/cx";
import { fuzzyMatch, prepareNeedle } from "@/utils/fuzzy";
import { isEmpty } from "@/utils/is-empty";
import css from "./combobox.module.css";
import { ComboboxMenu, type ComboboxMenuItem } from "./combobox-menu";
import { ComboboxResults, type ResultRenderer } from "./combobox-results";

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

type CreatableOptions = {
  label: (value: string) => React.ReactNode;
  onCreate: (value: string) => void;
};

export type Props<T extends Coded> = {
  autoFocus?: boolean;
  className?: string;
  creatable?: CreatableOptions;
  defaultOpen?: boolean;
  disabled?: boolean;
  omitFloatingPortal?: boolean;
  id: string;
  items: T[];
  itemToString?: (item: T) => string;
  label: React.ReactNode;
  locale: string;
  limit?: number;
  noResultsLabel?: React.ReactNode;
  omitItemPadding?: boolean;
  onValueChange?: (value: T[]) => void;
  onEscapeBlur?: () => void;
  placeholder?: string;
  readonly?: boolean;
  renderItem?: (item: T) => React.ReactNode;
  renderResult?: ResultRenderer<T>;
  showLabel?: boolean;
  selectedItems: (T | undefined)[];
};

// TODO: the logic here is very messy, extract to a reducer when adding group support.
export function Combobox<T extends Coded>(props: Props<T>) {
  const {
    autoFocus,
    className,
    creatable,
    defaultOpen,
    disabled,
    id,
    items,
    itemToString = defaultItemToString,
    label,
    limit,
    noResultsLabel,
    placeholder,
    omitItemPadding,
    onValueChange,
    onEscapeBlur,
    readonly,
    renderItem = defaultRenderer,
    renderResult,
    selectedItems,
    showLabel,
    omitFloatingPortal,
  } = props;

  const { t } = useTranslation();

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
    onOpenChange(nextOpen, event, reason) {
      if (!nextOpen && reason === "outside-press") {
        event?.stopPropagation();
      }

      setOpen(nextOpen);
    },
  });

  const listRef = useRef<HTMLElement[]>([]);

  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  const filteredItems = useMemo(
    () => fuzzy(inputValue, items, itemToString),
    [items, inputValue, itemToString],
  );

  const menuItems = useMemo(() => {
    const result = filteredItems.map<ComboboxMenuItem<T>>((item) => ({
      code: item.code,
      item,
      type: "item",
    }));

    const createValue = inputValue.trim();
    if (!creatable || !createValue) return result;

    const hasMatchingItem = items.some(
      (item) =>
        itemToString(item).trim().toLowerCase() === createValue.toLowerCase(),
    );

    if (!hasMatchingItem) {
      result.push({
        code: `create:${createValue}`,
        label: creatable.label(createValue),
        type: "create",
        value: createValue,
      });
    }

    return result;
  }, [creatable, filteredItems, inputValue, itemToString, items]);

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

  const setSelectedMenuItem = useCallback(
    (menuItem: ComboboxMenuItem<T>) => {
      if (menuItem.type === "item") {
        setSelectedItem(menuItem.item);
        return;
      }

      creatable?.onCreate(menuItem.value);
      setInputValue("");
      setOpen(false);

      const ref = refs.reference.current;

      if (ref instanceof HTMLInputElement && document.activeElement !== ref) {
        ref.focus();
      }
    },
    [creatable, refs.reference, setSelectedItem],
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
    setActiveIndex(menuItems.length > 0 ? 0 : undefined);
  }, [menuItems.length]);

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
                onKeyDown(evt: React.KeyboardEvent<HTMLInputElement>) {
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
                    const activeItem = menuItems[activeIndex];
                    if (activeItem) {
                      setSelectedMenuItem(activeItem);
                      setOpen(false);
                    }
                  } else if (evt.key === "ArrowDown") {
                    evt.preventDefault();
                    setActiveIndex((prev) => {
                      if (menuItems.length === 0) return undefined;
                      if (activeIndex == null || prev == null) return 0;
                      return prev < menuItems.length - 1 ? prev + 1 : prev;
                    });
                    if (!isOpen) setOpen(true);
                  } else if (evt.key === "ArrowUp") {
                    evt.preventDefault();
                    setActiveIndex((prev) => {
                      if (menuItems.length === 0) return undefined;
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
                onChange(evt: React.ChangeEvent<HTMLInputElement>) {
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
                items={menuItems}
                listRef={listRef}
                noResultsLabel={noResultsLabel ?? t("common.no_results")}
                omitItemPadding={omitItemPadding}
                renderItem={renderItem}
                selectedItems={selectedItems}
                setActiveIndex={setActiveIndex}
                setSelectedItem={setSelectedMenuItem}
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
