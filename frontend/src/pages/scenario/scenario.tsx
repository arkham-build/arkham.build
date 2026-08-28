import { useParams } from "wouter";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import { selectScenarioByCode } from "@/store/selectors/content";
import { displayPackName } from "@/utils/formatting";
import { ErrorStatus } from "../errors/404";

function Scenario() {
  const { code } = useParams();
  const scenario = useStore((state) => selectScenarioByCode(state, code));

  if (!scenario) {
    return <ErrorStatus statusCode={404} />;
  }

  const title = displayPackName(scenario);

  return (
    <AppLayout title={title}>
      <h1>{title}</h1>
    </AppLayout>
  );
}

export default Scenario;
