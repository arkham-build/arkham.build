# Translations

The app and its data are fully translatable and PRs with new translations are _welcome_.

Translations for the user-interface are handled with [react-i18next](https://react.i18next.com/) and live in the `./frontend/src/locales/` folder as JSON files.

Translations for cards and metadata are sourced from the [arkhamdb-json-data](https://github.com/Kamalisk/arkhamdb-json-data) and the [arkham-cards-data](https://github.com/zzorba/arkham-cards-data) and assembled by our API.

## Creating translations

1. Create a copy of `en.json` in the `./frontend/src/locales` folder and rename it to your locale's ISO-639 code.
2. Add your locale to the `LOCALES` array in `./frontend/src/utils/constants`.
3. Run `npm run i18n:pull -w frontend` to pull in some translations (traits, deck options) from ArkhamCards automatically.
4. _(if your locale has translated card data)_ Create an issue to get the card data added to the card data backend.
5. Translate and open a PR.

## Updating translations

1. Run `npm run i18n:sync -w frontend` to sync newly added translation keys to your locale.
2. (optional) If there are new _traits_ or _uses_ attributes that have been translated in ArkhamCards, run `npm run i18n:pull` to sync translations from ArkhamCards.
3. Update the translation file and open a PR.
