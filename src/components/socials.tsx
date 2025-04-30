import { BoardGameGeekIcon } from "./icons/boardgamegeek-icon";
import { DiscordIcon } from "./icons/discord-icon";
import { GithubIcon } from "./icons/github-icon";
import { Button } from "./ui/button";

export function Socials(props: {
  className?: string;
}) {
  return (
    <div className={props.className}>
      <Button
        as="a"
        href="https://github.com/arkham-build/arkham.build"
        target="_blank"
        rel="noreferrer"
        variant="bare"
        iconOnly
        size="lg"
      >
        <GithubIcon />
      </Button>
      <Button
        as="a"
        href="https://boardgamegeek.com/thread/3497091/arkhambuild-a-web-deck-builder"
        target="_blank"
        rel="noreferrer"
        variant="bare"
        iconOnly
        size="lg"
      >
        <BoardGameGeekIcon />
      </Button>
      <Button
        as="a"
        href="https://discord.com/channels/225349059689447425/1264242716179431670"
        target="_blank"
        rel="noreferrer"
        variant="bare"
        iconOnly
        size="lg"
      >
        <DiscordIcon />
      </Button>
    </div>
  );
}
