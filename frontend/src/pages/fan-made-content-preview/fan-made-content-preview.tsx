import type { FanMadeProject } from "@arkham-build/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "wouter";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { Loader } from "@/components/ui/loader";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { ListLayoutNoSidebar } from "@/layouts/list-layout-no-sidebar";
import { useStore } from "@/store";
import { selectIsInitialized } from "@/store/selectors/shared";
import { queryFanMadeProjectData } from "@/store/services/queries";
import { useDocumentTitle } from "@/utils/use-document-title";
import { ErrorStatus } from "../errors/404";
import css from "./fan-made-content-preview.module.css";

function FanMadeContentPreview() {
  const { t } = useTranslation();

  const { id } = useParams<{ id: string }>();

  const localFanMadePack = useStore((state) => state.fanMadeData.projects[id]);
  const cacheFanMadeProject = useStore((state) => state.cacheFanMadeProject);
  const uncacheFanMadeProject = useStore(
    (state) => state.uncacheFanMadeProject,
  );

  const fanMadeProjectQuery = useQuery<FanMadeProject>({
    queryKey: ["fanMadeProject", id],
    queryFn: () =>
      queryFanMadeProjectData(`fan_made_content/${id}/project.json`),
    enabled: !localFanMadePack,
  });

  useEffect(() => {
    if (fanMadeProjectQuery.data) {
      cacheFanMadeProject(fanMadeProjectQuery.data);
    }

    return () => {
      if (fanMadeProjectQuery.data) {
        uncacheFanMadeProject(fanMadeProjectQuery.data);
      }
    };
  }, [fanMadeProjectQuery, uncacheFanMadeProject, cacheFanMadeProject]);

  if (localFanMadePack) {
    return <FanMadeContentPreviewInner project={localFanMadePack} />;
  }

  if (fanMadeProjectQuery.isPending) {
    return (
      <Loader message={t("fan_made_content.messages.content_loading")} show />
    );
  }

  if (fanMadeProjectQuery.isError || !fanMadeProjectQuery.data) {
    return <ErrorStatus statusCode={404} />;
  }

  return <FanMadeContentPreviewInner project={fanMadeProjectQuery.data} />;
}

function FanMadeContentPreviewInner({ project }: { project: FanMadeProject }) {
  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);
  const removeList = useStore((state) => state.removeList);

  useDocumentTitle(project.meta.name);

  useEffect(() => {
    const listKey = `fan-made-content-preview-${project.meta.code}`;

    addList(
      listKey,
      {
        card_type: "",
        ownership: "all",
        fan_made_content: "fan-made",
        cycle: [project.meta.code],
      },
      {
        additionalFilters: ["cycle"],
        display: {
          viewMode: "scans",
        },
        fanMadeCycleCodes: [project.meta.code],
        lockedFilters: new Set(["cycle"]),
        showInvestigatorFilter: true,
        showOwnershipFilter: false,
      },
    );

    setActiveList(listKey);

    return () => {
      removeList(listKey);
      setActiveList(undefined);
    };
  }, [addList, removeList, setActiveList, project]);

  const activeList = useStore((state) => state.lists[state.activeList ?? ""]);
  const isInitalized = useStore(selectIsInitialized);

  if (!activeList || !isInitalized) {
    return null;
  }

  const iconUrl = project.data.packs[0]?.icon_url;

  return (
    <CardModalProvider>
      <ListLayoutContextProvider>
        <ListLayoutNoSidebar
          title={
            <div className={css["title"]}>
              {iconUrl && (
                <div className={css["title-icon"]}>
                  <img className="external-icon" src={iconUrl} alt="" />
                </div>
              )}
              {project.meta.name}
            </div>
          }
          titleString={project.meta.name}
        />
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}

export default FanMadeContentPreview;
