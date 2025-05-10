# arkham.build

> [arkham.build](https://arkham.build) is a web-based deckbuilder for Arkham Horror: The Card Game™.

## Metadata additions

arkham.build extends the _arkhamdb deck schema_ with a few fields for additional functionality.

- `meta.extra_deck`: Parallel Jim's spirit deck. Format: comma-separated list of ids `"id1,id2,id3"`.
- `meta.attachments_{code}`: cards that are attached to a specific setup deck, for example _Joe Diamond_ or _Stick to the Plan_. Format: comma-separated list of ids `"id1,id2,id2,id3"`.
- `meta.card_pool`: packs that can be used for this deck. Used for limited pool deckbuilding such as #campaign-playalong. Format: `"<pack_code>,<pack_code>"`. For arkham.build, new format pack codes take precedence over old format.
- `meta.sealed_deck`: card ids that are pickable for this deck. Used for sealed deckbuilding. Format: comma-separated list of `id` / `quantity` pairs in the format `"id:2,id:1,..."`.
- `meta.sealed_deck_name`: name of the sealed deck definition used. format: string.
- `meta.transform_into`: code of the investigator that this deck's investigator has transformed into. I.e. `04244` for _Body of a Yithian_.
- `meta.banner_url`: URL to an image to be displayed as banner for the deck. Preferably aspect ratio `4:1`.
- `meta.intro_md`: Short deck introduction that uses the same markdown format that `description_md` uses.
- `meta.annotation_{code}`: Annotation for a specific card that uses the same markdown format that `description_md` uses. Annotations are not limited to cards in deck, but can also target cards in the side deck (upgrades, alternatives) or _any_ card (reasoning for exclusion).

### Additional metadata keys (AMK)

ArkhamDB imposes a strict limit on the amount of data that can be stored in the `meta` field of a deck. In order to work around this, we extract some of our custom metadata from `deck.meta` and store it in our own database before a deck is saved to ArkhamDB. The information is replaced with a token that can be used to retrieve it, the so called `amk`  (**a**dditional **m**etadata **k**ey). When a deck is fetched from ArkhamDB, our API consumes the entry and writes the actual metadata back to the `deck.meta`. The process is transparent to the API consumer.

The following fields are currently handled in this fashion:

- `meta.annotation_{code}`
- `meta.intro_md`
- `meta.sealed_deck`
- `meta.sealed_deck_name`

There is a public endpoint to resolve an `amk` via `GET https://api.arkham.build/v1/public/additional_metadata/:amk`.

## File formats

### Sealed decks

The sealed deck feature expects a csv file in the format:

```csv
code,quantity
01039,2
01090,2
06197,2
07032,2
```

In this example, the sealed deck contains two copies of _Deduction_, _Perception_, _Practice Makes Perfect_ and _Promise of Power_, so users would only be able to add these cards to their deck in the deck builder.

## Development

1. Create an `.env` file from `.env.example`.
2. `npm install`
3. `npm run dev`

## Translations

The app and its data are fully translatable and PRs with new translations are _welcome_.

Translations for the user-interface are handled with [react-i18next](https://react.i18next.com/) and live in the `./src/locales/` folder as JSON files.

Translations for cards and metadata are sourced from the [arkhamdb-json-data](https://github.com/Kamalisk/arkhamdb-json-data) and the [arkham-cards-data](https://github.com/zzorba/arkham-cards-data) and assembled by our API.

### Creating translations

1. Create a copy of `en.json` in the `./src/locales` folder and rename it to your locale's ISO-639 code.
2. Add your locale to the `LOCALES` array in `./src/utils/constants`.
3. Run `npm run i18n:pull` to pull in some translations (traits, deck options) from ArkhamCards automatically.
4. _(if your locale has translated card data)_ Create an issue to get the card data added to the card data backend.
5. Translate and open a PR.

### Updating translations

1. Run `npm run i18n:sync` to sync newly added translation keys to your locale.
2. (optional) If there are new _traits_ or _uses_ attributes that have been translated in ArkhamCards, run `npm run i18n:pull` to sync translations from ArkhamCards.
3. Update the translation file and open a PR.

## Architecture

arkham.build is a SPA app that, by default, stores data locally in an IndexedDB database. The SPA has several backend components that it uses to enrich functionality.

### api.arkham.build

The API source code is tracked in a private git repo. It has a few functions:

1. a cache for metadata  such as cards and sets.
2. a cached proxy for public ArkhamDB endpoints.
3. a [token-mediating backend](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps#name-token-mediating-backend) for authenticated ArkhamDB endpoints.
4. a CRUD API for public _shares_.
5. a generator for opengraph previews.

### Recommendation API

The recommendation API is a seperate [project](https://github.com/TartanLlama/arkham-rec-provider/).

### Cloudflare Pages functions

We leverage a few Cloudflare Pages functions for rewriting the HTML we serve to _some_ clients. Currently, this is used to inject OpenGraph tags for social media bots.

## Icons

Arkham-related SVG icons are sourced from ArkhamCards's [icomoon project](https://github.com/zzorba/ArkhamCards/blob/master/assets/icomoon/project.json) and loaded as webfonts.

In order to update icon fonts, the workflow is:
1. Load the icomoon project you want to update.
2. Add the icons you want. Select everything and generate a font.
3. Convert the font to `.woff2`.
4. Replace the font, icomoon project in the assets directory.
5. Update the CSS file from the generated icomoon css. If you are updating the `icon` icon set, beware that there are some manual overrides in the file (visible in the git diff).

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
