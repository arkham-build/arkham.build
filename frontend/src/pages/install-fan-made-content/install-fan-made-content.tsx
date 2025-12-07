import { Redirect, useSearchParams } from "wouter";

function InstallFanMadeContent() {
  const [searchParams] = useSearchParams();

  const id = searchParams.get("id");
  const url = searchParams.get("url");

  if (!id && !url) {
    return <Redirect to="/" />;
  }

  const mappedSearch = id
    ? `install_id=${encodeURIComponent(id)}`
    : `install_url=${encodeURIComponent(url as string)}`;

  return <Redirect to={`settings?tab=fan-made-content&${mappedSearch}`} />;
}

export default InstallFanMadeContent;
