import { cx } from "@/utils/cx";
import css from "./related-card-container.module.css";
import { Checkbox } from "./ui/checkbox";

type TitledContainerProps = {
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  selected?: boolean;
  testId?: string;
  titleNode: React.ReactNode;
};

export function TitledContainer(props: TitledContainerProps) {
  const { actions, children, className, selected, testId, titleNode } = props;

  return (
    <article
      className={cx(css["container"], selected && css["selected"], className)}
      data-testid={testId}
    >
      <header className={css["header"]}>
        <div className={css["title"]}>{titleNode}</div>
        {actions}
      </header>
      {children}
    </article>
  );
}

type RelatedCardContainerProps = Omit<TitledContainerProps, "titleNode"> & {
  selection?: {
    checked: boolean;
    disabled?: boolean;
    id: string;
    onChange: () => void;
  };
  title: React.ReactNode;
};

export function RelatedCardContainer(props: RelatedCardContainerProps) {
  const { selection, title, ...rest } = props;

  return (
    <TitledContainer
      {...rest}
      titleNode={
        selection ? (
          <Checkbox
            checked={selection.checked}
            data-testid="cardset-select"
            disabled={selection.disabled}
            id={selection.id}
            label={title}
            onCheckedChange={selection.onChange}
          />
        ) : (
          <h2>{title}</h2>
        )
      }
    />
  );
}
