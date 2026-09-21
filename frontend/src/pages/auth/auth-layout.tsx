import { useLayoutEffect } from "react";
import { Plane } from "@/components/ui/plane";
import { AppLayout } from "@/layouts/app-layout";
import css from "./auth-layout.module.css";

type Props = {
  children?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  title: string;
};

export function AuthLayout(props: Props) {
  const { children, description, footer, title } = props;

  useLayoutEffect(() => {
    document.body.classList.add(css["auth-background"]);

    return () => {
      document.body.classList.remove(css["auth-background"]);
    };
  }, []);

  return (
    <AppLayout title={title}>
      <div className={css["container"]}>
        <Plane className={css["plane"]} as="section" size="none">
          <header className={css["header"]}>
            <h1 className={css["title"]}>{title}</h1>
          </header>
          {description && <p className={css["description"]}>{description}</p>}
          {children && <div className={css["content"]}>{children}</div>}
          {footer && <footer className={css["footer"]}>{footer}</footer>}
        </Plane>
      </div>
    </AppLayout>
  );
}
