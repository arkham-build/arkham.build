import { HeartIcon } from "lucide-react";
import { localizeArkhamDBBaseUrl } from "@/utils/arkhamdb";
import { cx } from "@/utils/cx";
import { formatDate } from "@/utils/formatting";
import { Tag } from "../ui/tag";
import css from "./arkhamdb-decklist-meta.module.css";

type Props = {
  className?: string;
  date_creation: string;
  like_count: number;
  user_id: number;
  user_name: string;
  user_reputation: number;
};

export function ArkhamdbDecklistMeta(props: Props) {
  const {
    className,
    date_creation,
    like_count,
    user_id,
    user_name,
    user_reputation,
  } = props;

  return (
    <div className={cx(css["deck-meta"], className)}>
      <div className={css["deck-meta-row"]}>
        <Tag className={css["likes"]} size="xs">
          <HeartIcon />
          {like_count}
        </Tag>
        <a
          className={css["author-link"]}
          href={`${localizeArkhamDBBaseUrl()}/user/profile/${user_id}/${user_name}`}
          rel="noreferrer"
          target="_blank"
        >
          {user_name} <span>&middot; {user_reputation}</span>
        </a>
      </div>
      <time dateTime={date_creation}>{formatDate(date_creation)}</time>
    </div>
  );
}
