import { useTranslation } from "react-i18next";
import { AppLayout } from "@/layouts/app-layout";

function Campaigns() {
  const { t } = useTranslation();
  const title = t("campaigns.title");

  return (
    <AppLayout title={title}>
      <h1>{title}</h1>
    </AppLayout>
  );
}

export default Campaigns;
