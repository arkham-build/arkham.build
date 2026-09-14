import {
  autoUpdate,
  FloatingFocusManager,
  FloatingPortal,
  type FloatingPortalProps,
  flip,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

  const [activeIndex, setActiveIndex] = useState<number | undefined>(
    defaultOpen ? 0 : undefined,
  );
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);
  const [inputValue, setInputValue] = useState("");

  const setOpen = (nextOpen: boolean) => {
    if (nextOpen === isOpen) return;

    setIsOpen(nextOpen);
    setActiveIndex(nextOpen ? 0 : undefined);
  };

  const {
    context,
    elements,
    refs: { setFloating, setReference },
    floatingStyles,
  } = useFloating({
    whileElementsMounted: autoUpdate,
    placement: "bottom-start",
    strategy: omitFloatingPortal ? "absolute" : "fixed",
    open: isOpen,
    middleware: [
      offset(5),
      flip({ padding: 5 }),
      shift({ padding: 5 }),
      size({
        padding: 5,
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            minWidth: `${rects.reference.width}px`,
          });
        },
      }),
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

  const filteredItems = fuzzy(inputValue, items, itemToString);

  const menuItems = (() => {
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
  })();

  const normalizedActiveIndex =
    !isOpen || menuItems.length === 0
      ? undefined
      : activeIndex == null || activeIndex >= menuItems.length
        ? 0
        : activeIndex;

  const setSelectedItem = (item: T) => {
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

    const ref = elements.reference;

    if (ref instanceof HTMLInputElement) {
      setInputValue("");
      setActiveIndex(0);
      if (ref && document.activeElement !== ref) {
        ref.focus();
      }
    }
  };

  const setSelectedMenuItem = (menuItem: ComboboxMenuItem<T>) => {
    if (menuItem.type === "item") {
      setSelectedItem(menuItem.item);
      return;
    }

    creatable?.onCreate(menuItem.value);
    setInputValue("");
    setActiveIndex(0);
    setOpen(false);

    const ref = elements.reference;

    if (ref instanceof HTMLInputElement && document.activeElement !== ref) {
      ref.focus();
    }
  };

  const removeSelectedItem = (index: number) => {
    const next = [...selectedItems] as T[];
    next.splice(index, 1);
    onValueChange?.(next);
  };

  useEffect(() => {
    listRef.current = [];
  }, [menuItems.length]);

  return (
    <div className={cx(css["combobox"], className)} data-testid={id}>
      <div className={cx(!showLabel && readonly && "sr-only")}>
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
              ref={setReference}
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
                  } else if (
                    evt.key === "Enter" &&
                    normalizedActiveIndex != null
                  ) {
                    evt.preventDefault();
                    const activeItem = menuItems[normalizedActiveIndex];
                    if (activeItem) {
                      setSelectedMenuItem(activeItem);
                      setOpen(false);
                    }
                  } else if (evt.key === "ArrowDown") {
                    evt.preventDefault();
                    setActiveIndex(
                      normalizedActiveIndex == null
                        ? 0
                        : Math.min(
                            normalizedActiveIndex + 1,
                            menuItems.length - 1,
                          ),
                    );
                    if (!isOpen) setOpen(true);
                  } else if (evt.key === "ArrowUp") {
                    evt.preventDefault();
                    setActiveIndex(
                      normalizedActiveIndex == null
                        ? 0
                        : Math.max(normalizedActiveIndex - 1, 0),
                    );
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
                    setActiveIndex(0);
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
              data-testid="combobox-menu"
              ref={setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
            >
              <ComboboxMenu
                activeIndex={normalizedActiveIndex}
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
