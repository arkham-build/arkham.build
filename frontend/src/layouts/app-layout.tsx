import { Footer } from "@/components/footer";
import { Masthead } from "@/components/masthead";
import { PageTitle } from "@/components/ui/page-title";
import { cx } from "@/utils/cx";
import css from "./app-layout.module.css";

type Props = {
  children: React.ReactNode;
  mainClassName?: string;
  title: string;
} & React.HTMLProps<HTMLDivElement>;

export function AppLayout(props: Props) {
  const { children, mainClassName, title, ref, ...rest } = props;

  return (
    <div
      {...rest}
      className={cx(css["layout"], "fade-in")}
      data-testid="app-layout"
      ref={ref}
    >
      <PageTitle>{title}</PageTitle>
      <div className={css["layout-inner"]}>
        <Masthead className={css["header"]} />
        <section className={cx(css["main"], mainClassName)}>{children}</section>
        <footer className={css["footer"]}>
          <Footer />
        </footer>
      </div>
    </div>
  );
}
