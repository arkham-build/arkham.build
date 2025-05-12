import { Footer } from "@/components/footer";
import { Masthead } from "@/components/masthead";
import { cx } from "@/utils/cx";
import { useDocumentTitle } from "@/utils/use-document-title";
import { forwardRef } from "react";
import css from "./app-layout.module.css";

type Props = {
  children: React.ReactNode;
  mainClassName?: string;
  title: string;
} & React.HTMLProps<HTMLDivElement>;

export const AppLayout = forwardRef(function AppLayout(
  props: Props,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const { children, mainClassName, title, ...rest } = props;

  useDocumentTitle(title);

  return (
    <div
      {...rest}
      className={cx(css["layout"], "fade-in")}
      data-testid="app-layout"
      ref={ref}
    >
      <div className={css["layout-inner"]}>
        <Masthead className={css["header"]} />
        <section className={cx(css["main"], mainClassName)}>{children}</section>
        <footer className={css["footer"]}>
          <Footer />
        </footer>
      </div>
    </div>
  );
});
