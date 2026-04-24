## Behavior

- Keep answers short and concise.
- Don't start implementing, designing, or modifying code unless explicitly asked to.

## Code style

- Use newspaper style: public/primary functions at the top of the file, private/utility functions at the bottom of the file.
- Comment sparsely. Comments should explain the _WHY_ behind the code, not the code itself.

## Typescript rules

- Add imports at the top of the file. Valid exceptions: dynamic `import()`.
- No `any` type unless absolutely necessary. Instead, prefer `unknown` or `never` where a narrow type cannot be provided.

## React rules

- No hardcoded text in the user interface. Instead, use `react-i18next` and a translation label in `./locales/en.json`.
- No inline styles. Valid exceptions: dynamic CSS variables.
