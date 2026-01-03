import {
  FloatingFocusManager,
  FloatingList,
  FloatingPortal,
  useClick,
  useDismiss,
  useInteractions,
  useListItem,
  useListNavigation,
  useRole,
  useTypeahead,
} from "@floating-ui/react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
import { cx } from "@/utils/cx";
import css from "./custom-select.module.css";
import { usePopover } from "./popover.hooks";
import { Scroller } from "./scroller";

type Value = string;

export type Item = {
  label: string;
  value: Value;
};

type Props = {
  className?: string;
  disabled?: boolean;
  id?: string;
  items: Item[];
  itemToString?: (item: Item) => string;
  initialOpen?: boolean;
  menuClassName?: string;
  onOpenChange?: (open: boolean) => void;
  onValueChange: (value: Value) => void;
  renderItem?: (item: Item | undefined) => React.ReactNode;
  renderControl?: (item: Item | undefined) => React.ReactNode;
  value: Value;
  variant?: "compact";
};

export function CustomSelect(props: Props) {
  const {
    className,
    disabled,
    id,
    initialOpen,
    items,
    itemToString = defaultItemToString,
    menuClassName,
    onValueChange,
    renderControl,
    renderItem = defaultRenderItem,
    value,
    variant,
  } = props;

  const [open, setOpen] = useState(!!initialOpen);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const selectedIndex = items.findIndex((item) => item.value === value);
  const selectedItem = items[selectedIndex];

  const { refs, floatingStyles, context } = usePopover({
    placement: "bottom",
    open,
    onOpenChange: setOpen,
  });

  const onSelectItem = useCallback(
    (index: number) => {
      setOpen(false);
      setActiveIndex(null);
      const item = items[index];
      if (item) onValueChange(item.value);
    },
    [onValueChange, items],
  );

  const elementsRef = useRef<(HTMLElement | null)[]>([]);
  const labelsRef = useRef(items.map(itemToString));
  const isTypingRef = useRef(false);

  const listNav = useListNavigation(context, {
    listRef: elementsRef,
    activeIndex,
    selectedIndex,
    onNavigate: setActiveIndex,
  });

  const typeahead = useTypeahead(context, {
    listRef: labelsRef,
    activeIndex,
    selectedIndex,
    onMatch(index) {
      if (open) {
        setActiveIndex(index);
      } else if (items[index]) {
        onSelectItem(index);
      }
    },
    onTypingChange(isTyping) {
      isTypingRef.current = isTyping;
    },
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "listbox" });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [listNav, typeahead, click, dismiss, role],
  );

  return (
    <div
      className={cx(css["container"], variant && css[variant], className)}
      id={id}
    >
      <button
        {...getReferenceProps()}
        className={css["control"]}
        data-testid="custom-select-control"
        disabled={disabled}
        ref={refs.setReference}
        type="button"
      >
        {(renderControl || renderItem)(selectedItem)}
        <ChevronsUpDownIcon className={css["control-indicator"]} />
      </button>
      {open && (
        <FloatingPortal id={FLOATING_PORTAL_ID}>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
            >
              <div className={cx(css["menu"], menuClassName)}>
                <Scroller>
                  <FloatingList elementsRef={elementsRef} labelsRef={labelsRef}>
                    {items.map((item, index) => (
                      <Option
                        {...getItemProps({
                          onClick: () => onSelectItem(index),
                          onKeyDown(event) {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              onSelectItem(index);
                            }

                            if (event.key === " " && !isTypingRef.current) {
                              event.preventDefault();
                              onSelectItem(index);
                            }
                          },
                        })}
                        activeIndex={activeIndex}
                        data-testid={`custom-select-option-${item.value}`}
                        key={item.value}
                        item={item}
                        itemToString={itemToString}
                        renderItem={renderItem}
                        selectedIndex={selectedIndex}
                      />
                    ))}
                  </FloatingList>
                </Scroller>
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}

function Option({
  activeIndex,
  item,
  itemToString,
  renderItem,
  selectedIndex,
  ...rest
}: {
  activeIndex: number | null;
  item: Item;
  itemToString: (item: Item) => string;
  renderItem: (item: Item) => React.ReactNode;
  selectedIndex: number;
} & React.HTMLAttributes<HTMLButtonElement>) {
  const { ref, index } = useListItem({
    label: itemToString(item),
  });

  const isActive = activeIndex === index;
  const isSelected = selectedIndex === index;

  return (
    <button
      {...rest}
      className={cx(
        css["option"],
        isSelected && css["selected"],
        isActive && css["active"],
      )}
      ref={ref}
      role="option"
      type="button"
    >
      {isSelected && <CheckIcon className={css["option-indicator"]} />}
      {renderItem(item)}
    </button>
  );
}

function defaultItemToString(item: Item) {
  return item ? item.label : "";
}

function defaultRenderItem(item: Item) {
  return <span>{item.label}</span>;
}
