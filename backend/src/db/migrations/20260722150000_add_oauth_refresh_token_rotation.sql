-- migrate:up

alter table oauth_refresh_token
  add column rotated_at timestamp;

-- migrate:down

alter table oauth_refresh_token
  drop column if exists rotated_at;
