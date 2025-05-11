import { useStore } from "@/store";
import {
  addProjectToMetadata,
  cloneMetadata,
} from "@/store/lib/fan-made-content";
import type { FanMadeProject } from "@/store/lib/fan-made-content.schemas";
import { getGroupedCards } from "@/store/lib/grouping";
import { makeSortFunction } from "@/store/lib/sorting";
import { selectOwnedFanMadeProjects } from "@/store/selectors/fan-made-content";
import {
  selectLocaleSortingCollator,
  selectMetadata,
} from "@/store/selectors/shared";
import type { Card } from "@/store/services/queries.types";
import type { Metadata } from "@/store/slices/metadata.types";
import { cx } from "@/utils/cx";
import { parseMarkdown } from "@/utils/markdown";
import * as z from "@zod/mini";
import {
  ExternalLinkIcon,
  EyeIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { CardGrid } from "../card-list/card-grid";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { FileInput } from "../ui/file-input";
import { MediaCard } from "../ui/media-card";
import { Modal, ModalContent } from "../ui/modal";
import { useToast } from "../ui/toast.hooks";
import css from "./fan-made-content-collection.module.css";

export function FanMadeContentCollection() {
  const toast = useToast();

  const fanMadeProjects = useStore(selectOwnedFanMadeProjects);
  const metadata = useStore(selectMetadata);
  const sortingCollator = useStore(selectLocaleSortingCollator);

  const addFanMadeProject = useStore((state) => state.addFanMadeProject);
  const removeFanMadeProject = useStore((state) => state.removeFanMadeProject);

  const { t } = useTranslation();

  const onAddLocalProject = useCallback(
    async (evt: React.ChangeEvent<HTMLInputElement>) => {
      const files = evt.target.files;
      if (!files?.length) return;

      for (const file of files) {
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          await addFanMadeProject(parsed);
        } catch (err) {
          const message =
            err instanceof z.core.$ZodError
              ? z.prettifyError(err)
              : (err as Error).message;

          toast.show({
            children: message,
            variant: "error",
          });

          console.error(err);
          // biome-ignore lint/suspicious/noExplicitAny: debug.
          console.log("error details:", (err as any)?.issues);
        }
      }
    },
    [addFanMadeProject, toast],
  );

  return (
    <section className={css["collection"]}>
      <header className={css["header"]}>
        <h2 className={css["title"]}>{t("fan_made_content.collection")}</h2>
        <FileInput
          accept="application/json"
          id="collection-import"
          onChange={onAddLocalProject}
        >
          <UploadIcon /> {t("deck_collection.import_json")}
        </FileInput>
      </header>
      <div className={css["projects"]}>
        {fanMadeProjects.map((project) => {
          const { meta } = project;

          const projectMetadata = selectMetadataWithPack(metadata, project);

          const projectCards = Object.values(project.data.cards)
            .map((card) => projectMetadata.cards[card.code])
            .filter((x) => !x.hidden);

          const groupedCards = getGroupedCards(
            ["encounter_set", "subtype", "type", "slot"],
            projectCards,
            makeSortFunction(
              ["position", "name", "level"],
              projectMetadata,
              sortingCollator,
            ),
            projectMetadata,
            sortingCollator,
          );

          const groups = [] as { key: string; type: string }[];
          const groupCounts = [] as number[];
          const cards = [] as Card[];

          for (const group of groupedCards.data) {
            cards.push(...group.cards);

            groups.push({
              key: group.key,
              type: group.type,
            });

            groupCounts.push(group.cards.length);
          }

          return (
            <MediaCard
              className={css["project"]}
              key={meta.code}
              bannerAlt={meta.name}
              bannerUrl={meta.banner_url}
              title={<h3>{meta.name}</h3>}
            >
              <h4>{meta.author}</h4>

              <div className={cx(css["section"], "longform")}>
                {meta.description && (
                  <div
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: escaped in markdown parser
                    dangerouslySetInnerHTML={{
                      __html: parseMarkdown(meta.description),
                    }}
                  />
                )}

                {meta.external_link && (
                  <Button
                    as="a"
                    variant="link"
                    href={meta.external_link}
                    size="none"
                  >
                    {t("fan_made_content.view_external")}
                    <ExternalLinkIcon />
                  </Button>
                )}
              </div>

              <nav className={css["actions"]}>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button iconOnly size="sm">
                      <EyeIcon /> View cards
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <Modal
                      size="90%"
                      actionsClassName={css["modal-actions"]}
                      innerClassName={css["modal-inner"]}
                    >
                      <ModalContent
                        className={css["modal-content"]}
                        mainClassName={css["modal-content-main"]}
                      >
                        <CardGrid
                          data={{
                            cards,
                            totalCardCount: cards.length,
                            key: project.meta.code,
                            groups,
                            groupCounts,
                          }}
                          listMode="grouped"
                          metadata={metadata}
                          viewMode="scans"
                        />
                      </ModalContent>
                    </Modal>
                  </DialogContent>
                </Dialog>
                <Button
                  iconOnly
                  size="sm"
                  onClick={() => removeFanMadeProject(project.meta.code)}
                >
                  <Trash2Icon /> Remove
                </Button>
              </nav>
            </MediaCard>
          );
        })}
      </div>
    </section>
  );
}

function selectMetadataWithPack(metadata: Metadata, project: FanMadeProject) {
  const meta = cloneMetadata(metadata);
  addProjectToMetadata(meta, project);
  return meta;
}
