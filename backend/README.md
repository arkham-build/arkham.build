# api.arkham.build

Backend for [arkham.build](https://arkham.build).

## Overview

The Node.js service uses Hono, PostgreSQL, and Kysely. It serves public card data, manages accounts and synced data, and mediates ArkhamDB access. A pg-boss worker runs email, ingestion, and cache maintenance jobs. Dbmate manages migrations, Vitest and Testcontainers run integration tests, and Kamal deploys the API and worker.

## Develop

Run these commands from the repository root:

```sh
npm install
cp backend/.env.example backend/.env
npm run compose:up --workspace backend
npm run dbmate --workspace backend -- up
npm run ingest --workspace backend
npm run dev --workspace backend

# Run in another terminal when background jobs are needed.
npm run dev:worker --workspace backend
```

You can find a pre-configured [Yaak](https://yaak.app/) workspace in `./config/yaak`.

## Deploy

Refer to available [Kamal commands](https://kamal-deploy.org/docs/commands/view-all-commands/) and the additional `aliases` in the `deploy.yml` file.

## Acknowledgements

The original recommendation logic was contributed by [Sy Brand / TartanLlama](https://github.com/TartanLlama) in a [separate project](https://github.com/TartanLlama/arkham-rec-provider/) and has since been ported over.
