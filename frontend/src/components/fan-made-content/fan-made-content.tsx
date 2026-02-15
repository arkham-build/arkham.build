import {
  type FanMadeProject,
  type FanMadeProjectInfo,
  FanMadeProjectSchema,
} from "@arkham-build/shared";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "wouter";
import { z } from "zod";
import type { SettingProps } from "@/pages/settings/types";
import { useStore } from "@/store";
import { selectOwnedFanMadeProjects } from "@/store/selectors/fan-made-content";
import {
  queryFanMadeProjectData,
  queryFanMadeProjects,
} from "@/store/services/queries";
import type { FanMadeContentFilter } from "@/store/slices/lists.types";
import { assert } from "@/utils/assert";
import { cx } from "@/utils/cx";
import { capitalize, formatDate } from "@/utils/formatting";
import { fuzzyMatch, prepareNeedle } from "@/utils/fuzzy";
import { isEmpty } from "@/utils/is-empty";
import { parseMarkdown } from "@/utils/markdown";
import { useHotkey } from "@/utils/use-hotkey";
import { ErrorDisplay, ErrorImage } from "../error-display/error-display";
import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";
import { Field, FieldLabel } from "../ui/field";
import { FileInput } from "../ui/file-input";
import { Loader } from "../ui/loader";
import { MediaCard } from "../ui/media-card";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "../ui/modal";
import { Plane } from "../ui/plane";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { SearchInput } from "../ui/search-input";
import { Select } from "../ui/select";
import { Tag } from "../ui/tag";
import { useToast } from "../ui/toast.hooks";
import css from "./fan-made-content.module.css";

type Filterable = {
  meta: FanMadeProject["meta"];
};

export function FanMadeContent(props: SettingProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  // TECH DEBT: the current preview implementation re-uses the card grid.
  // we don't want preview modals here, make sure a user interaction does not persist one.
  const closeCardModal = useStore((state) => state.closeCardModal);
  useEffect(() => {
    return () => {
      closeCardModal();
    };
  }, [closeCardModal]);

  const addFanMadeProject = useStore((state) => state.addFanMadeProject);

  const listingsQuery = useQuery({
    queryFn: queryFanMadeProjects,
    queryKey: ["fan-made-project-info"],
  });

  const onAddProject = useCallback(
    async (payload: unknown) => {
      try {
        const search = new URLSearchParams(window.location.search);
        search.delete("install_id");
        search.delete("install_url");

        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}?${search.toString()}`,
        );

        await addFanMadeProject(payload);
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
        // biome-ignore lint/suspicious/noExplicitAny: debug
        console.info("error details:", (err as any)?.issues);
      }
    },
    [addFanMadeProject, toast, t],
  );

  const installId = searchParams.get("install_id");
  const installUrl = searchParams.get("install_url");

  const [search, setSearchValue] = useState("");

  const projectFilter = useMemo(() => {
    function projectFilterfn<T extends Filterable>(
      projects: T[] | undefined,
    ): T[] | undefined {
      const needle = prepareNeedle(search);

      if (!search || !projects) return projects;
      if (!needle) return projects;

      return projects.filter((project) => {
        const haystack = project.meta.name + project.meta.author;
        return fuzzyMatch([haystack], needle);
      });
    }
    return projectFilterfn;
  }, [search]);

  const searchChange = useCallback((val: string) => {
    setSearchValue(val);
  }, []);

  return (
    <div className={css["container"]}>
      <DisplaySettings {...props} />
      <FanMadeSearch search={search} onSearchChange={searchChange} />
      <Collection
        onAddProject={onAddProject}
        listingsQuery={listingsQuery}
        filterFn={projectFilter}
      />
      <Registry
        onAddProject={onAddProject}
        listingsQuery={listingsQuery}
        filterFn={projectFilter}
      />
      {!!(installId || installUrl) && (
        <QuickInstallDialog
          onAddProject={onAddProject}
          id={installId || undefined}
          url={installUrl || undefined}
        />
      )}
    </div>
  );
}

function DisplaySettings(props: SettingProps) {
  const { settings, setSettings } = props;

  const { t } = useTranslation();

  const options = useMemo(
    () => [
      {
        value: "all",
        label: t("filters.fan_made_content.all"),
      },
      {
        value: "official",
        label: t("filters.fan_made_content.official"),
      },
      {
        value: "fan-made",
        label: t("filters.fan_made_content.fan_made"),
      },
    ],
    [t],
  );

  const onChangeDisplay = useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      setSettings({
        ...settings,
        cardListsDefaultContentType: evt.target.value as FanMadeContentFilter,
      });
    },
    [setSettings, settings],
  );

  return (
    <section className={css["section"]}>
      <header className={css["header"]}>
        <h2 className={css["title"]}>{t("settings.display.title")}</h2>
      </header>
      <Field bordered helpText={t("fan_made_content.settings.card_lists_help")}>
        <FieldLabel htmlFor="fan-made-content-list-display">
          {t("fan_made_content.settings.card_lists")}
        </FieldLabel>
        <Select
          defaultValue={settings.cardListsDefaultContentType}
          id="fan-made-content-list-display"
          onChange={onChangeDisplay}
          options={options}
          required
        />
      </Field>
    </section>
  );
}

type SearchProps = {
  search: string;
  onSearchChange: (val: string) => void;
};

function FanMadeSearch({ search, onSearchChange }: SearchProps) {
  const { t } = useTranslation();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(
    document.getElementById("settings-header-portal"),
  );

  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!portalTarget) {
      const target = document.getElementById("settings-header-portal");
      setPortalTarget(target);
    }
  }, [portalTarget]);

  const onFocusSearch = useCallback(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, []);

  useHotkey("/", onFocusSearch);

  const searchElement = (
    <search className={css["fan-made-search"]}>
      <SearchInput
        bindSlashKey
        placeholder={t("fan_made_content.filter_fan_made_content")}
        id="fanmade-search-input"
        ref={ref}
        value={search}
        onValueChange={onSearchChange}
      />
    </search>
  );

  if (portalTarget) {
    return createPortal(searchElement, portalTarget);
  }

  return searchElement;
}

type RegistryProps = {
  onAddProject: (payload: unknown) => Promise<void>;
  filterFn: <T extends Filterable>(
    projects: T[] | undefined,
  ) => T[] | undefined;
  listingsQuery: UseQueryResult<FanMadeProjectInfo[]>;
};

function Collection({ onAddProject, listingsQuery, filterFn }: RegistryProps) {
  const { t } = useTranslation();

  const owned = useStore(selectOwnedFanMadeProjects);
  const filteredOwned = filterFn(owned);

  const { onAddFromRegistry, onAddFromUrl, onAddLocalProject } =
    useProjectRegistry(onAddProject);

  const removeFanMadeProject = useStore((state) => state.removeFanMadeProject);

  return (
    <section className={css["section"]} data-testid="collection">
      <header className={css["header"]}>
        <h2 className={css["title"]}>
          {t("fan_made_content.installed_content")}
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
            <Button data-testid="collection-import-url">
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
                  data-testid="collection-import-url-input"
                  type="url"
                  id="url"
                  name="url"
                  placeholder={t("fan_made_content.import_url.placeholder")}
                />
              </Field>
              <Button
                size="sm"
                type="submit"
                data-testid="collection-import-url-submit"
              >
                {t("fan_made_content.import_url.submit")}
              </Button>
            </Plane>
          </PopoverContent>
        </Popover>
      </nav>

      {isEmpty(filteredOwned) && (
        <div className={css["empty"]} data-testid="collection-placeholder">
          <BookDashedIcon className={css["empty-icon"]} />
          <p className={css["empty-title"]}>{t("fan_made_content.empty")}</p>
        </div>
      )}

      {filteredOwned && (
        <div className={css["list"]}>
          {filteredOwned.map((project) => {
            const { meta } = project;

            const hasRemote = !!meta.url;

            const listing = listingsQuery.data?.find(
              (listing) => listing.meta.code === meta.code,
            );

            return (
              <ProjectCard key={meta.code} project={project}>
                {hasRemote && listing && (
                  <ProjectInstallStatus
                    installed={project}
                    remote={listing}
                    onUpdate={onAddFromRegistry}
                  />
                )}
                <Button
                  as="a"
                  href={`/fan-made-content/preview/${meta.code}`}
                  size="sm"
                  data-testid="collection-project-view-cards"
                  rel="noreferrer"
                  target="_blank"
                >
                  <EyeIcon /> {t("fan_made_content.actions.view_cards")}
                </Button>
                <Button
                  data-testid="collection-project-uninstall"
                  size="sm"
                  onClick={() => removeFanMadeProject(project.meta.code)}
                >
                  <Trash2Icon /> {t("fan_made_content.actions.uninstall")}
                </Button>
              </ProjectCard>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Registry({ onAddProject, listingsQuery, filterFn }: RegistryProps) {
  const { t } = useTranslation();
  const filteredProjects = filterFn(listingsQuery.data);
  const { onAddFromRegistry } = useProjectRegistry(onAddProject);

  const owned = useStore((state) => state.fanMadeData.projects);

  return (
    <section className={css["section"]}>
      <header className={css["header"]}>
        <h2 className={css["title"]}>
          {t("fan_made_content.available_content")}
        </h2>
      </header>

      {!!listingsQuery.error && (
        <div className={css["error"]}>
          {t("fan_made_content.messages.registry_failed", {
            error: (listingsQuery.error as Error)?.message,
          })}
        </div>
      )}

      {listingsQuery.isPending && (
        <div className={css["loader"]}>
          <Loader
            message={t("fan_made_content.messages.available_content_loading")}
            show
          />
        </div>
      )}

      {!listingsQuery.isPending && isEmpty(filteredProjects) && (
        <div className={css["empty"]} data-testid="registry-placeholder">
          <BookDashedIcon className={css["empty-icon"]} />
          <p className={css["empty-title"]}>
            {t("fan_made_content.messages.no_match")}
          </p>
        </div>
      )}

      {!listingsQuery.isPending && filteredProjects && (
        <div className={css["list"]}>
          {filteredProjects.map((listing) => {
            const { meta } = listing;
            const projectOwned = owned[meta.code];

            const addProject = () => {
              onAddFromRegistry(listing);
            };

            return (
              <ProjectCard key={meta.code} project={listing}>
                <Button
                  as="a"
                  href={`/fan-made-content/preview/${meta.code}`}
                  size="sm"
                  data-testid="collection-project-view-cards"
                  rel="noreferrer"
                  target="_blank"
                >
                  <EyeIcon /> {t("fan_made_content.actions.view_cards")}
                </Button>
                {projectOwned ? (
                  <ProjectInstallStatus
                    installed={projectOwned}
                    remote={listing}
                    onUpdate={onAddFromRegistry}
                    showFallback
                  />
                ) : (
                  <Button size="sm" onClick={addProject}>
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

function ProjectInstallStatus(props: {
  onUpdate: (listing: FanMadeProjectInfo) => Promise<void>;
  installed?: FanMadeProject;
  remote?: FanMadeProjectInfo;
  showFallback?: boolean;
}) {
  const { installed, remote, showFallback, onUpdate } = props;

  const { t } = useTranslation();

  if (!remote?.meta.date_updated || !installed?.meta.date_updated) {
    return null;
  }

  const updateAvailable =
    new Date(remote.meta.date_updated) > new Date(installed.meta.date_updated);

  if (!updateAvailable) {
    return showFallback ? (
      <span className={css["installed"]}>
        <CheckIcon />
        {t("fan_made_content.status_installed")}
      </span>
    ) : null;
  }

  return (
    <Button variant="primary" size="sm" onClick={() => onUpdate(remote)}>
      <CloudDownloadIcon />
      {t("fan_made_content.status_update_available")}
    </Button>
  );
}

function ProjectCard(props: {
  children?: React.ReactNode;
  headerSlot?: React.ReactNode;
  project: FanMadeProject | FanMadeProjectInfo;
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
      data-testid="collection-project"
      key={meta.code}
      headerSlot={
        <>
          {headerSlot}
          {meta.banner_credit && (
            <p className={cx(css["banner-credit"], "blurred-background")}>
              {t("fan_made_content.banner_credit", {
                credit: meta.banner_credit,
              })}
            </p>
          )}
        </>
      }
      footerSlot={
        <div className={css["project-footer-row"]}>
          {!isEmpty(project.meta.types) && (
            <Field>
              <FieldLabel>{t("fan_made_content.content_types")}</FieldLabel>
              <ol className={css["tag-row"]}>
                {project.meta.types.map((type) => (
                  <Tag as="li" key={type}>
                    {t(`fan_made_content.types.${type}`)}
                  </Tag>
                ))}
              </ol>
            </Field>
          )}

          {!isEmpty(project.meta.tags) && (
            <Field>
              <FieldLabel>{t("fan_made_content.tags")}</FieldLabel>
              <ol className={css["tag-row"]}>
                {project.meta.tags.map((type) => (
                  <Tag as="li" key={type}>
                    {type}
                  </Tag>
                ))}
              </ol>
            </Field>
          )}

          <Field>
            <FieldLabel>{t("fan_made_content.content_version")}</FieldLabel>
            <ol className={css["tag-row"]}>
              <Tag as="li">{capitalize(project.meta.language)}</Tag>
              <Tag as="li">
                {t(`fan_made_content.status.${project.meta.status}`)}
              </Tag>
              {meta.date_updated && (
                <Tag as="li">{formatDate(meta.date_updated)}</Tag>
              )}
            </ol>
          </Field>
          <nav className={css["actions"]}>{children}</nav>
        </div>
      }
      bannerAlt={meta.name}
      bannerUrl={meta.banner_url}
      title={<h3 data-testid="collection-project-title">{meta.name}</h3>}
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
    </MediaCard>
  );
}

function QuickInstallDialog({
  onAddProject,
  id,
  url,
}: {
  id?: string;
  url?: string;
  onAddProject: (payload: unknown) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  const queryFn = id
    ? () => queryFanMadeProjectData(`fan_made_content/${id}/project.json`)
    : async () => {
        const res = await fetch(url as string);
        assert(res.ok, `Bad status code: ${res.status}`);
        return res.json();
      };

  const { data, error, isLoading } = useQuery({
    queryFn,
    queryKey: ["quick-install", id || url],
    enabled: open && (id != null || url != null),
  });

  const onInstall = useCallback(async () => {
    if (!data) return;
    await onAddProject(data);
    setOpen(false);
  }, [data, onAddProject]);

  const validation = data ? FanMadeProjectSchema.safeParse(data) : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <Modal>
          <ModalBackdrop />
          <ModalInner size="60rem">
            <ModalActions />
            <DefaultModalContent title={t("fan_made_content.actions.install")}>
              {isLoading && (
                <div className={css["loader"]}>
                  <Loader
                    message={t("fan_made_content.messages.content_loading")}
                    show
                  />
                </div>
              )}
              {(error || validation?.error) && (
                <ErrorDisplay
                  pre={<ErrorImage />}
                  message={
                    error
                      ? t("fan_made_content.messages.fetch_failed", {
                          error: (error as Error).message,
                        })
                      : t("fan_made_content.messages.parse_failed", {
                          error: z.prettifyError(
                            validation?.error as z.ZodError,
                          ),
                        })
                  }
                  status={400}
                />
              )}
              {data && validation?.success && (
                <div className={css["quick-install"]}>
                  <ProjectCard project={data} />
                  <nav className={css["quick-install-actions"]}>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={onInstall}
                      data-testid="quick-install"
                    >
                      {t("fan_made_content.actions.install")}
                    </Button>
                    <Button
                      variant="bare"
                      onClick={() => setOpen(false)}
                      size="lg"
                    >
                      {t("common.cancel")}
                    </Button>
                  </nav>
                </div>
              )}
            </DefaultModalContent>
          </ModalInner>
        </Modal>
      </DialogContent>
    </Dialog>
  );
}

function useProjectRegistry(onAddProject: (payload: unknown) => Promise<void>) {
  const { t } = useTranslation();
  const toast = useToast();

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
    async (project: FanMadeProjectInfo) => {
      await onAddQuery(() => queryFanMadeProjectData(project.bucket_path));
    },
    [onAddQuery],
  );

  return {
    onAddLocalProject,
    onAddFromUrl,
    onAddFromRegistry,
  };
}
