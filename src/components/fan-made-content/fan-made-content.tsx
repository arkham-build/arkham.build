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
import {
  type FanMadeProjectListing,
  queryFanMadeProjectData,
  queryFanMadeProjects,
} from "@/store/services/queries";
import type { Card } from "@/store/services/queries.types";
import type { Metadata } from "@/store/slices/metadata.types";
import { assert } from "@/utils/assert";
import { cx } from "@/utils/cx";
import { isEmpty } from "@/utils/is-empty";
import { parseMarkdown } from "@/utils/markdown";
import { useQuery } from "@/utils/use-query";
import * as z from "@zod/mini";
import {
  BookDashedIcon,
  CheckIcon,
  CloudDownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileJson2Icon,
  LinkIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { CardGrid } from "../card-list/card-grid";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Field, FieldLabel } from "../ui/field";
import { FileInput } from "../ui/file-input";
import { Loader } from "../ui/loader";
import { MediaCard } from "../ui/media-card";
import { Modal, ModalContent } from "../ui/modal";
import { Plane } from "../ui/plane";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useToast } from "../ui/toast.hooks";
import css from "./fan-made-content.module.css";

export function FanMadeContent() {
  const { t } = useTranslation();
  const toast = useToast();

  const addFanMadeProject = useStore((state) => state.addFanMadeProject);

  const onAddProject = useCallback(
    async (payload: unknown) => {
      try {
        await addFanMadeProject(payload);

        toast.show({
          children: t("fan_made_content.messages.content_installed"),
          variant: "success",
          duration: 3000,
        });
      } catch (err) {
        const message =
          err instanceof z.core.$ZodError
            ? z.prettifyError(err)
            : (err as Error).message;

        toast.show({
          children: t("fan_made_content.messages.parse_failed", {
            error: message,
          }),
          variant: "error",
        });

        console.error(err);
        // biome-ignore lint/suspicious/noExplicitAny: debug.
        console.log("error details:", (err as any)?.issues);
      }
    },
    [addFanMadeProject, toast, t],
  );

  return (
    <div className={css["container"]}>
      <Collection />
      <Registry onAddProject={onAddProject} />
    </div>
  );
}

function Collection() {
  const { t } = useTranslation();

  const owned = useStore(selectOwnedFanMadeProjects);

  const removeFanMadeProject = useStore((state) => state.removeFanMadeProject);

  return (
    <section className={css["section"]}>
      <header className={css["header"]}>
        <h2 className={css["title"]}>
          {t("fan_made_content.installed_content")}
        </h2>
      </header>

      {isEmpty(owned) && (
        <div className={css["empty"]}>
          <BookDashedIcon className={css["empty-icon"]} />
          <p className={css["empty-title"]}>{t("fan_made_content.empty")}</p>
        </div>
      )}

      <div className={css["list"]}>
        {owned.map((project) => {
          const { meta } = project;
          return (
            <ProjectCard key={meta.code} project={project}>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <EyeIcon /> {t("fan_made_content.actions.view_cards")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <PreviewModal project={project} />
                </DialogContent>
              </Dialog>
              <Button
                size="sm"
                onClick={() => removeFanMadeProject(project.meta.code)}
              >
                <Trash2Icon /> {t("fan_made_content.actions.uninstall")}
              </Button>
            </ProjectCard>
          );
        })}
      </div>
    </section>
  );
}

function Registry({
  onAddProject,
}: { onAddProject: (payload: unknown) => Promise<void> }) {
  const toast = useToast();

  const { t } = useTranslation();

  const listings = useQuery(queryFanMadeProjects);

  const onAddQuery = useCallback(
    async (query: () => Promise<FanMadeProject>) => {
      let project: FanMadeProject;
      let toastId: string | undefined;

      try {
        toastId = toast.show({
          children: t("fan_made_content.messages.content_loading"),
          variant: "loading",
        });
        project = await query();
      } catch (err) {
        toast.show({
          children: t("fan_made_content.messages.fetch_failed", {
            error: (err as Error).message,
          }),
          variant: "error",
        });

        console.error(err);
        return;
      } finally {
        if (toastId) toast.dismiss(toastId);
      }

      await onAddProject(project);
    },
    [onAddProject, toast, t],
  );

  const onAddLocalProject = useCallback(
    async (evt: React.ChangeEvent<HTMLInputElement>) => {
      const files = evt.target.files;
      if (!files?.length) return;
      for (const file of files) {
        const text = await file.text();
        await onAddProject(JSON.parse(text));
      }
    },
    [onAddProject],
  );

  const onAddFromUrl = useCallback(
    async (evt: React.FormEvent<HTMLFormElement>) => {
      evt.preventDefault();
      evt.stopPropagation();

      const formData = new FormData(evt.currentTarget);

      const url = formData.get("url")?.toString();
      if (!url) return;

      await onAddQuery(async () => {
        const res = await fetch(url);
        assert(res.ok, `Bad status code: ${res.status}`);
        return res.json();
      });
    },
    [onAddQuery],
  );

  const onAddFromRegistry = useCallback(
    async (project: FanMadeProjectListing) => {
      await onAddQuery(() => queryFanMadeProjectData(project.bucket_path));
    },
    [onAddQuery],
  );

  const owned = useStore((state) => state.fanMadeData.projects);

  const loading = !listings.data && !listings.error;

  return (
    <section className={css["section"]}>
      <header className={css["header"]}>
        <h2 className={css["title"]}>
          {t("fan_made_content.available_content")}
        </h2>
      </header>

      <nav className={css["actions"]}>
        <FileInput
          accept="application/json"
          id="collection-import"
          onChange={onAddLocalProject}
        >
          <FileJson2Icon /> {t("fan_made_content.actions.import_file")}
        </FileInput>
        <Popover>
          <PopoverTrigger asChild>
            <Button>
              <LinkIcon /> {t("fan_made_content.actions.import_url")}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <Plane
              className={css["import-popover"]}
              as="form"
              onClick={(evt: React.MouseEvent) => {
                evt.stopPropagation();
              }}
              onSubmit={onAddFromUrl}
            >
              <Field>
                <FieldLabel htmlFor="url">
                  {t("fan_made_content.import_url.label")}
                </FieldLabel>
                <input
                  className={css["import-popover-input"]}
                  type="url"
                  id="url"
                  name="url"
                  placeholder={t("fan_made_content.import_url.placeholder")}
                />
              </Field>
              <Button size="sm" type="submit">
                {t("fan_made_content.import_url.submit")}
              </Button>
            </Plane>
          </PopoverContent>
        </Popover>
      </nav>

      {!!listings.error && (
        <div className={css["error"]}>
          {t("fan_made_content.messages.registry_failed", {
            error: (listings.error as Error)?.message,
          })}
        </div>
      )}

      {loading && (
        <div className={css["loader"]}>
          <Loader
            message={t("fan_made_content.messages.available_content_loading")}
            show
          />
        </div>
      )}

      {listings.data && (
        <div className={css["list"]}>
          {listings.data.map((listing) => {
            const { meta } = listing;
            const projectOwned = owned[meta.code];
            return (
              <ProjectCard key={meta.code} project={listing}>
                {projectOwned ? (
                  <span className={css["installed"]}>
                    <CheckIcon />
                    {t("fan_made_content.status_installed")}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      onAddFromRegistry(listing);
                    }}
                  >
                    <CloudDownloadIcon />{" "}
                    {t("fan_made_content.actions.install")}
                  </Button>
                )}
              </ProjectCard>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ProjectCard(props: {
  children?: React.ReactNode;
  headerSlot?: React.ReactNode;
  project: FanMadeProject | FanMadeProjectListing;
}) {
  const { children, headerSlot, project } = props;
  const { meta } = project;

  const { t } = useTranslation();

  const classNames = {
    container: css["project"],
    header: css["project-header"],
    content: css["project-content"],
    footer: css["project-footer"],
  };

  return (
    <MediaCard
      classNames={classNames}
      key={meta.code}
      headerSlot={headerSlot}
      footerSlot={<nav className={css["actions"]}>{children}</nav>}
      bannerAlt={meta.name}
      bannerUrl={meta.banner_url}
      title={<h3>{meta.name}</h3>}
    >
      <h4>{meta.author}</h4>

      <div className={cx(css["content"], "longform")}>
        {meta.description && (
          <div
            // biome-ignore lint/security/noDangerouslySetInnerHtml: escaped in markdown parser
            dangerouslySetInnerHTML={{
              __html: parseMarkdown(meta.description),
            }}
          />
        )}
      </div>
      {meta.external_link && (
        <p>
          <Button as="a" variant="link" href={meta.external_link} size="none">
            {t("fan_made_content.actions.view_external")}
            <ExternalLinkIcon />
          </Button>
        </p>
      )}

      {meta.date_updated && <p>v{meta.date_updated}</p>}
    </MediaCard>
  );
}

function PreviewModal({ project }: { project: FanMadeProject }) {
  const metadata = useStore(selectMetadata);
  const sortingCollator = useStore(selectLocaleSortingCollator);

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
  );
}

function selectMetadataWithPack(metadata: Metadata, project: FanMadeProject) {
  const meta = cloneMetadata(metadata);
  addProjectToMetadata(meta, project);
  return meta;
}
