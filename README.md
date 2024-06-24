# arkham.build

> [arkham.build](https://arkham.build) is a web-based deckbuilder for Arkham Horror: The Card Game™.

🗺️ [Roadmap](https://github.com/users/fspoettel/projects/5)

## Development

### API

The API is a separate, private git project hosted as a Cloudflare worker. It mainly serves as a cache for the ArkhamCards GraphQL API and a proxy for some arkhamdb API routes.

### Icons

Arkham-related SVG icons are sourced from ArkhamCards's [icomoon project](https://github.com/zzorba/ArkhamCards/blob/master/assets/icomoon/project.json) and loaded as webfonts. Additional icons are bundled as SVG via `vite-plugin-svgr` or imported from `lucide-react`.

<details>
  <summary><h2>Template readme</h2></summary>

# vite-react-ts-template

> extended version of [vite](https://vitejs.dev/)'s official `react-ts` template.

additional features:

- [biome](https://biomejs.dev/) for linting and code formatting.
- [lefthook](https://github.com/evilmartians/lefthook) for pre-commit checks.
- [vitest](https://vitest.dev/) for unit testing.
- [playwright](https://playwright.dev/) for end-to-end testing.
- [github actions](https://github.com/features/actions) for continuous integration.
- [browserslist](https://github.com/browserslist/browserslist) + [autoprefixer](https://github.com/postcss/autoprefixer).

## Install

```sh
# install dependencies.
npm i
```

## Develop

```sh
npm run dev
```

## Build

```sh
npm run build
```

## Test

```sh
npm test

# run vitest in watch mode.
npm run test:watch

# collect coverage.
npm run test:coverage
```

## Lint

```sh
npm run lint
```

## Format

```sh
npm run fmt
```

Prettier will be run automatically on commit via [lint-staged](https://github.com/okonet/lint-staged).

## Preview

Serves the content of `./dist` over a local http server.

```sh
npm run preview
```

</details>
