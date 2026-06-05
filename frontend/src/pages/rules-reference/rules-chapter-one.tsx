/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: trusted content. */
import html from "@/assets/rules.html?raw";
import { parseCardTextHtml } from "@/utils/card-utils";
import { RulesDocument } from "./rules-document";

export function RulesChapterOne() {
  const [toc, rules] = html.split("<!-- BEGIN RULES -->");

  return (
    <RulesDocument
      renderContent={() => <RulesHtmlContent rules={rules} />}
      renderToc={() => (
        <div
          dangerouslySetInnerHTML={{
            __html: parseCardTextHtml(toc, { newLines: "skip" }),
          }}
        />
      )}
      searchEnabled={false}
    />
  );
}

function RulesHtmlContent(props: { rules: string }) {
  const { rules } = props;

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: parseCardTextHtml(rules, { newLines: "skip" }),
      }}
    />
  );
}
