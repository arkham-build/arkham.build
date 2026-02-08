-- migrate:up

CREATE TABLE fan_made_project_info(
  id uuid PRIMARY KEY,
  bucket_path text NOT NULL,
  meta jsonb NOT NULL
);

-- migrate:down

DROP TABLE fan_made_project_info;


