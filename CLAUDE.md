# Development Guidelines

This document contains critical information about working with this codebase. Follow these guidelines precisely.

## Repository structure

- The repository is a monorepo managed with `npm workspaces`.
- There are 3 workspaces: `frontend`, `backend` and `shared`.

## Available commands

- `npm run check -w <workspace>` - check types
- `npm run test -w <workspace>` - run tests
- `npm run test:e2e -w frontend` - run end-to-end tests
- `npm run lint` - lint code
- `npm run fmt` - format code

## Available skills & MCP commands

- Use `playwright mcp` to open a browser to localhost:3000 to verify changes

## Core Development Rules

- Before marking a task as completed, always:
  1. check types
  2. run linter
  3. run tests
  4. run formatter
- Make sure that added display text is translatable. We use `i18next` for translations. DO NOT translate text, but add the english labels to `./frontend/src/locales/en.json`. Follow existing key naming conventions and re-use `common` labels if possible.
- Add comments sparsely, and focus on comments that explain the _WHY_ behind code. Don't add comments that explain the following passage of code.
- Never use the `any` type. Instead, prefer `unknown` or `never` where a narrow type cannot be provided.
- Always add non-dynamic `import` statements to the top of the file. Do not use inline imports to import type definitions.
