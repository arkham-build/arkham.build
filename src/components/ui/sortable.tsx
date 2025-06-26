import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DraggableAttributes,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontalIcon } from "lucide-react";
import type React from "react";
import { forwardRef, useCallback, useMemo, useState } from "react";
import { cx } from "@/utils/cx";
import { Button } from "./button";
import css from "./sortable.module.css";

type SortableId = string | number;

type SortableData =
  | SortableId
  | {
      id: SortableId;
    };

type Props<T extends SortableData> = {
  activeItems?: SortableId[];
  className?: string;
  items: T[];
  onSort(items: T[]): void;
  overlayClassName?: string;
  renderItemContent: (item: T) => React.ReactNode;
};

export function Sortable<T extends SortableData>(props: Props<T>) {
  const { activeItems, items, onSort, overlayClassName, renderItemContent } =
    props;

  const [activeId, setActiveId] = useState<SortableId | undefined>();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((evt: DragStartEvent) => {
    const { active } = evt;
    setActiveId(active.id);
  }, []);

  const handleDragEnd = useCallback(
    (evt: DragEndEvent) => {
      const { active, over } = evt;

      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((x) => readId(x) === active.id);
        const newIndex = items.findIndex((x) => readId(x) === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const sorted = arrayMove(items, oldIndex, newIndex);
        onSort(sorted);
      }

      setActiveId(undefined);
    },
    [onSort, items],
  );

  const dropAnimation = useMemo(
    () => ({
      duration: 250,
      easing: "ease-out",
    }),
    [],
  );

  const activeItem = findActiveItem(activeId, items);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul className={css["items"]}>
          {items.map((item) => (
            <SortableItem
              id={readId(item)}
              key={readId(item)}
              active={isActive(activeItems, item)}
            >
              {renderItemContent(item)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
      <DragOverlay
        className={cx(css["overlay"], overlayClassName)}
        wrapperElement="ul"
        dropAnimation={dropAnimation}
      >
        {activeId && activeItem ? (
          <Item active={isActive(activeItems, activeId)}>
            {renderItemContent(activeItem)}
          </Item>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableItem(props: {
  active?: boolean;
  children: React.ReactNode;
  id: SortableId;
}) {
  const { active, children, id } = props;

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandleProps = useMemo(
    () => ({ ...attributes, ...listeners }),
    [attributes, listeners],
  );

  return (
    <Item
      active={active}
      data-testid={`sortable-item-${id}`}
      dragHandleProps={dragHandleProps}
      ref={setNodeRef}
      style={style}
    >
      {children}
    </Item>
  );
}

interface ItemProps extends React.HTMLAttributes<HTMLLIElement> {
  active?: boolean;
  children: React.ReactNode;
  dragHandleProps?: DraggableAttributes | undefined;
}

const Item = forwardRef(
  (props: ItemProps, ref: React.ForwardedRef<HTMLLIElement>) => {
    const { active, children, dragHandleProps, ...rest } = props;

    return (
      <li
        className={cx(css["item"], active && css["active"])}
        ref={ref}
        {...rest}
      >
        <div className={css["item-handle"]}>
          <Button
            className={cx(
              css["item-handle-button"],
              !dragHandleProps && css["static"],
            )}
            data-testid="sortable-drag-handle"
            type="button"
            variant="bare"
            iconOnly
            size="lg"
            {...dragHandleProps}
          >
            <GripHorizontalIcon />
          </Button>
        </div>
        <div className={css["item-content"]}>{children}</div>
      </li>
    );
  },
);

function readId<T extends SortableData>(data: T) {
  return typeof data === "object" ? data.id : (data as SortableId);
}

function isActive<T extends SortableData>(
  activeItems: SortableId[] | undefined,
  item: T,
) {
  return activeItems?.includes(readId(item)) ?? false;
}

function findActiveItem<T extends SortableData>(
  id: SortableId | undefined,
  items: T[],
) {
  if (!id) return;
  return items.find((item) => readId(item) === id);
}
