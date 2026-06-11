-- migrate:up

alter table account
  rename column profile_completed to profile_completed_at;

alter table account
  alter column profile_completed_at drop default,
  alter column profile_completed_at drop not null,
  alter column profile_completed_at type timestamp using case when profile_completed_at then updated_at else null end,
  alter column profile_completed_at set default now();

-- migrate:down

alter table account
  rename column profile_completed_at to profile_completed;

alter table account
  alter column profile_completed drop default,
  alter column profile_completed type boolean using profile_completed is not null,
  alter column profile_completed set not null,
  alter column profile_completed set default true;
