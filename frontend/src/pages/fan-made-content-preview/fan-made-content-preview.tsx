import type { FanMadeProject } from "@arkham-build/shared";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "wouter";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { Loader } from "@/components/ui/loader";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { ListLayoutNoSidebar } from "@/layouts/list-layout-no-sidebar";
import { useFanMadeProjectDataQuery } from "@/queries/fan-made";
import { useStore } from "@/store";
import { selectIsInitialized } from "@/store/selectors/shared";
import { useTemporaryList } from "@/utils/use-temporary-list";
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

  const fanMadeProjectQuery = useFanMadeProjectDataQuery(
    `fan_made_content/${id}/project.json`,
    !localFanMadePack,
  );

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
  const listReady = useTemporaryList(
    `fan-made-content-preview-${project.meta.code}`,
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
      fanMadeCardCodes: new Set(project.data.cards.map((card) => card.code)),
      lockedFilters: new Set(["cycle"]),
      showInvestigatorFilter: true,
      showOwnershipFilter: false,
    },
    project,
  );

  const isInitalized = useStore(selectIsInitialized);

  if (!listReady || !isInitalized) {
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
