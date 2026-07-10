/* oxlint-disable react/no-danger -- trusted content. */
import type { GrimoireEntry, GrimoireSection } from "@arkham-build/shared";
import { ExternalLinkIcon, LoaderCircleIcon } from "lucide-react";
import { Fragment, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCardLinkTooltip } from "@/components/card-tooltip/use-card-link-tooltip";
import { Button } from "@/components/ui/button";
import { Plane } from "@/components/ui/plane";
import { Tag } from "@/components/ui/tag";
import { useGrimoireQuery } from "@/queries/grimoire";
import { parseCardTextHtml } from "@/utils/card-utils";
import { getGrimoireMarkdownHtml } from "./grimoire-markdown";
import type {
  FilteredGrimoire,
  GrimoireMaps,
} from "./rules-chapter-two.helpers";
import { buildGrimoireMaps, filterGrimoire } from "./rules-chapter-two.helpers";
import { RulesDocument } from "./rules-document";

type GrimoireHtmlMaps = {
  entryTextById: Map<string, string>;
  entryTitleById: Map<string, string>;
  sectionTextById: Map<string, string>;
  sectionTitleById: Map<string, string>;
};

export function RulesChapterTwo() {
  const { t } = useTranslation();
  const grimoire = useGrimoireQuery();

  const { cardLinkTooltip, referenceProps } = useCardLinkTooltip();

  useEffect(() => {
    if (grimoire.isPending || grimoire.error || !window.location.hash) return;

    const id = window.location.hash.slice(1);
    if (!id.startsWith("grimoire-")) return;

    requestAnimationFrame(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "auto" });
      }
    });
  }, [grimoire.error, grimoire.isPending]);

  const entries = useMemo(() => grimoire.data?.entries ?? [], [grimoire.data]);

  const sections = useMemo(
    () => grimoire.data?.sections ?? [],
    [grimoire.data],
  );

  const grimoireMaps = useMemo(
    () => buildGrimoireMaps(entries, sections),
    [entries, sections],
  );

  const grimoireHtmlMaps = useMemo(
    () => buildGrimoireHtmlMaps(entries, sections),
    [entries, sections],
  );

  const getFilteredGrimoire = (search: string) =>
    filterGrimoire(entries, sections, grimoireMaps, search);

  return (
    <RulesDocument
      renderContent={(search) => {
        const filteredGrimoire = getFilteredGrimoire(search);
        const hasContent = !!filteredGrimoire.sectionIds.size;

        return (
          <div className="grimoire longform" {...referenceProps}>
            <div className="grimoire-header">
              <h1>{t("rules.grimoire.intro_title")}</h1>
              <p>{t("rules.grimoire.intro_description")}</p>
              <Button
                as="a"
                href="https://ffgapp.com/qr/ahc100"
                rel="noreferrer"
                full
                target="_blank"
                variant="primary"
              >
                <ExternalLinkIcon />
                {t("rules.grimoire.open_link")}
              </Button>
            </div>
            {grimoire.isPending && (
              <GrimoireStatus>
                <LoaderCircleIcon className="spin" />
                {t("rules.grimoire.loading")}
              </GrimoireStatus>
            )}

            {grimoire.error && (
              <GrimoireStatus>{t("rules.grimoire.error")}</GrimoireStatus>
            )}

            {hasContent && (
              <div className="grimoire-list">
                {sections
                  .filter((section) =>
                    filteredGrimoire.sectionIds.has(section.id),
                  )
                  .map((section) => (
                    <GrimoireSectionBlock
                      filteredGrimoire={filteredGrimoire}
                      grimoireHtmlMaps={grimoireHtmlMaps}
                      grimoireMaps={grimoireMaps}
                      key={section.id}
                      section={section}
                    />
                  ))}
              </div>
            )}

            {!hasContent && !grimoire.isPending && !grimoire.error && (
              <GrimoireStatus>{t("rules.grimoire.empty")}</GrimoireStatus>
            )}

            {cardLinkTooltip}
          </div>
        );
      }}
      renderToc={(search) => {
        const filteredGrimoire = getFilteredGrimoire(search);
        const hasContent = filteredGrimoire.sectionIds.size;

        if (!hasContent) return null;

        return (
          <nav className="toc">
            <ol>
              {sections
                .filter((section) =>
                  filteredGrimoire.sectionIds.has(section.id),
                )
                .map((section) => (
                  <GrimoireTocItem
                    filteredGrimoire={filteredGrimoire}
                    grimoireHtmlMaps={grimoireHtmlMaps}
                    grimoireMaps={grimoireMaps}
                    key={section.id}
                    section={section}
                  />
                ))}
            </ol>
          </nav>
        );
      }}
    />
  );
}

function GrimoireStatus(props: { children: React.ReactNode }) {
  const { children } = props;
  return <output className="grimoire-status">{children}</output>;
}

function GrimoireTocItem(props: {
  filteredGrimoire: FilteredGrimoire;
  grimoireHtmlMaps: GrimoireHtmlMaps;
  grimoireMaps: GrimoireMaps;
  section: GrimoireSection;
}) {
  const { filteredGrimoire, grimoireHtmlMaps, grimoireMaps, section } = props;

  const entries = (
    grimoireMaps.entriesBySectionId.get(section.id) ?? []
  ).filter((entry) => filteredGrimoire.entryIds.has(entry.id));

  return (
    <li>
      <GrimoireHtmlLink
        href={`#${getGrimoireSectionAnchorId(section.id)}`}
        html={grimoireHtmlMaps.sectionTitleById.get(section.id) ?? ""}
      />
      {!!entries.length && (
        <ul>
          {entries.map((entry) => (
            <li key={entry.id}>
              <GrimoireHtmlLink
                href={`#${getGrimoireEntryAnchorId(entry.id)}`}
                html={grimoireHtmlMaps.entryTitleById.get(entry.id) ?? ""}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function GrimoireSectionBlock(props: {
  filteredGrimoire: FilteredGrimoire;
  grimoireHtmlMaps: GrimoireHtmlMaps;
  grimoireMaps: GrimoireMaps;
  section: GrimoireSection;
}) {
  const { filteredGrimoire, grimoireHtmlMaps, grimoireMaps, section } = props;

  const entries = (
    grimoireMaps.entriesBySectionId.get(section.id) ?? []
  ).filter((entry) => filteredGrimoire.entryIds.has(entry.id));

  const sectionTextHtml =
    grimoireHtmlMaps.sectionTextById.get(section.id) ?? "";

  return (
    <section
      className="grimoire-entry"
      id={getGrimoireSectionAnchorId(section.id)}
    >
      <GrimoireHeading
        html={grimoireHtmlMaps.sectionTitleById.get(section.id) ?? ""}
        section={section}
      />

      <div className="grimoire-entry-copy">
        {sectionTextHtml && (
          <div
            className="grimoire-text longform"
            dangerouslySetInnerHTML={{
              __html: sectionTextHtml,
            }}
          />
        )}

        {section.citation && (
          <p>
            <Tag size="sm">{section.citation}</Tag>
          </p>
        )}

        {entries.map((entry) => (
          <GrimoireEntryBlock
            entry={entry}
            grimoireHtmlMaps={grimoireHtmlMaps}
            key={entry.id}
          />
        ))}
      </div>
    </section>
  );
}

function GrimoireHeading(props: { html: string; section: GrimoireSection }) {
  const { html, section } = props;

  return (
    <h2 className="grimoire-entry-title">
      <GrimoireHtmlLink
        href={`#${getGrimoireSectionAnchorId(section.id)}`}
        html={html}
      />
    </h2>
  );
}

function GrimoireEntryBlock(props: {
  entry: GrimoireEntry;
  grimoireHtmlMaps: GrimoireHtmlMaps;
}) {
  const { t } = useTranslation();
  const { entry, grimoireHtmlMaps } = props;
  const entryTextHtml = grimoireHtmlMaps.entryTextById.get(entry.id) ?? "";

  return (
    <Plane
      as="article"
      className="grimoire-entry"
      id={getGrimoireEntryAnchorId(entry.id)}
    >
      <h3 className="grimoire-entry-title">
        <GrimoireHtmlLink
          href={`#${getGrimoireEntryAnchorId(entry.id)}`}
          html={grimoireHtmlMaps.entryTitleById.get(entry.id) ?? ""}
        />
      </h3>

      <div className="grimoire-entry-copy">
        {entryTextHtml && (
          <div
            className="grimoire-text longform"
            dangerouslySetInnerHTML={{
              __html: entryTextHtml,
            }}
          />
        )}

        {!!entry.references?.length && (
          <p className="grimoire-references">
            <strong>{t("rules.grimoire.references")}:</strong>{" "}
            <span>
              {entry.references.map((referenceId, index) => (
                <Fragment key={referenceId}>
                  {index > 0 ? ", " : null}
                  <GrimoireHtmlLink
                    href={`#${getGrimoireEntryAnchorId(referenceId)}`}
                    html={
                      grimoireHtmlMaps.entryTitleById.get(referenceId) ??
                      getGrimoireHtml(referenceId)
                    }
                  />
                </Fragment>
              ))}
            </span>
          </p>
        )}

        <p>
          <Tag size="xs">{entry.citation}</Tag>
        </p>
      </div>
    </Plane>
  );
}

function GrimoireHtmlLink(props: { href: string; html: string }) {
  const { href, html } = props;

  return <a dangerouslySetInnerHTML={{ __html: html }} href={href} />;
}

function buildGrimoireHtmlMaps(
  entries: GrimoireEntry[],
  sections: GrimoireSection[],
): GrimoireHtmlMaps {
  return {
    entryTextById: new Map(
      entries.map((entry) => [
        entry.id,
        entry.text ? getGrimoireMarkdownHtml(entry.text) : "",
      ]),
    ),
    entryTitleById: new Map(
      entries.map((entry) => [entry.id, getGrimoireHtml(entry.title)]),
    ),
    sectionTextById: new Map(
      sections.map((section) => [
        section.id,
        section.text ? getGrimoireMarkdownHtml(section.text) : "",
      ]),
    ),
    sectionTitleById: new Map(
      sections.map((section) => [section.id, getGrimoireHtml(section.title)]),
    ),
  };
}

function getGrimoireHtml(text: string) {
  return parseCardTextHtml(text, { newLines: "skip" });
}

function getGrimoireEntryAnchorId(id: string) {
  return `grimoire-entry-${encodeURIComponent(id)}`;
}

function getGrimoireSectionAnchorId(id: string) {
  return `grimoire-section-${encodeURIComponent(id)}`;
}
