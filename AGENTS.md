## Behavior

- Keep answers short and concise.
- Don't start implementing, designing, or modifying code unless explicitly asked to.
- Do not edit `schema.sql` directly. use dbmate's dump command to generate it.

## Code style

- Use newspaper style: public/primary functions at the top of the file, private/utility functions at the bottom of the file.

## Typescript rules

- Add imports at the top of the file. Valid exceptions: dynamic `import()`.
- Only `export` symbols when at least one other file imports them.
- No `any` type unless absolutely necessary. Instead, prefer `unknown` or `never` where a narrow type cannot be provided.

## Backend rules

- Features (`./src/features/`) are encapsulated. Do not import from a feature directly in other features, or in shared code. Rather, hoist the code to `./src/lib` when you need it.

## React rules

- No hardcoded text in the user interface. Instead, use `react-i18next` and a translation label in `./locales/en.json`.
- No inline styles. Valid exceptions: dynamic CSS variables.
