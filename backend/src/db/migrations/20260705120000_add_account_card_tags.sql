-- migrate:up

create table account_card_tag(
  account_id uuid primary key references account(id) on delete cascade,
  revision uuid not null default uuidv7(),
  state jsonb not null,
  constraint chk_account_card_tag_state_length check (
    octet_length(coalesce(state::text, '')) <= 1048576
  )
);

-- migrate:down

drop table if exists account_card_tag;
