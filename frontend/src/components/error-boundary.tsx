import type { ErrorInfo } from "react";
import { Component } from "react";
import { Translation } from "react-i18next";
import { ErrorDisplay } from "@/components/error-display/error-display";
import { ISSUE_URL } from "@/utils/constants";
import { Button } from "./ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ height: "100dvh", width: "100%" }}>
          <Translation>
            {(t) => (
              <ErrorDisplay message={t("errors.500")} status={500}>
                <div
                  style={{
                    border: "1px solid var(--palette-1)",
                    padding: "0.5rem",
                    display: "flex",
                    flexFlow: "column nowrap",
                    gap: "1rem",
                    maxHeight: "50vh",
                    overflowY: "auto",
                  }}
                >
                  <div className="longform" style={{ maxWidth: "80ch" }}>
                    <pre
                      style={{
                        background: "var(--palette-1)",
                        padding: "0.5rem",
                      }}
                    >
                      {this.state.message ?? "Unknown error"}
                    </pre>
                    <p>{t("errors.500_help")}</p>
                    <p>{t("errors.500_help_2")}</p>
                  </div>
                  <nav style={{ display: "flex", gap: "0.5rem" }}>
                    <Button as="a" href={ISSUE_URL}>
                      {t("errors.report")}
                    </Button>
                    <Button as="a" href="/" variant="bare">
                      {t("errors.home")}
                    </Button>
                  </nav>
                </div>
              </ErrorDisplay>
            )}
          </Translation>
        </main>
      );
    }

    return this.props.children;
  }
}
