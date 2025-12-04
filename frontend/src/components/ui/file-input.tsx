import { Button, type Props as ButtonProps } from "./button";

interface Props
  extends Omit<ButtonProps<"label">, "as" | "htmlFor" | "onChange" | "ref"> {
  accept?: string;
  children: React.ReactNode;
  id: string;
  multiple?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

export function FileInput(props: Props) {
  const { accept, children, id, multiple, onChange, ...rest } = props;

  return (
    <Button {...rest} as="label" data-testid={`${id}-button`} htmlFor={id}>
      <input
        className="sr-only"
        accept={accept}
        id={id}
        type="file"
        multiple={multiple}
        onChange={onChange}
      />
      {children}
    </Button>
  );
}
