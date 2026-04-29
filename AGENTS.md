## Typescript rules

- Add imports at the top of the file. Valid exceptions: dynamic `import()`.
- Only `export` symbols when at least one other file imports them.
- No `any` type unless absolutely necessary. Instead, prefer `unknown` or `never` where a narrow type cannot be provided.

## React rules

- No hardcoded text in the user interface. Instead, use `react-i18next` and a translation label in `./locales/en.json`.
- No inline styles. Valid exceptions: dynamic CSS variables.
