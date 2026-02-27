## Workspace Breakdown

### 1. Root Package (`/`)
- **Package Manager**: npm (Node 24.x)
- **Workspaces**: `backend`, `frontend`, `shared`
- **Scripts**: Biome for linting/formatting, Playwright for E2E tests
- **Dev Dependencies**: Biome, Playwright, Vitest, TypeScript 5.9.3

### 2. Frontend Package (`/frontend/`)
- **Build Tool**: Vite with React plugin
- **React Version**: 18.3.1
- **UI Components**: 
  - Radix UI primitives (@radix-ui/react-*)
  - Floating UI for popovers, dialogs etc. (`@floating-ui/react-*`)
  - Custom component library in `src/components/ui/` (80+ components)
  - Lucide icons
- **Styling Approach**:
  - CSS Modules (`.module.css` files)
  - CSS custom properties (CSS variables) for theming
  - Dark/light theme support via `data-theme` attribute
  - No Tailwind, no utility-first CSS
- **State Management**: Zustand
- **Internationalization**: i18next + react-i18next
- **Current Charts**: Recharts

### 3. Backend Package (`/backend/`)
- **Runtime**: Node with Hono
- **Database**: PostgreSQL with Kysely
- **Purpose**: API server for deck data

### 4. Shared Package (`/shared/`)
- **Purpose**: Shared types and utilities
- **Type**: TypeScript module exports

## Core development rules

- ALWAYS consider code quality when adding new code, if functions are getting too complex or code is duplicated, move relevant logic to a new file. Make sure functions are added in the most logical place, e.g. as methods on a struct where appropriate.
- Add comments sparsely, and focus on comments that explain the _WHY_ behind code. Don't add comments that explain the following passage of code.
- The code should follow the "newspaper" style where public and primary functions are at the top of the file, followed by private functions and utilities. ALWAYS put utility, private functions and "sub functions" underneath the function they're used in.

## Available skills & MCP commands

- Use `playwright mcp` to open a browser to verify changes.

## Typescript rules

- Before marking a task as completed, always:
  1. check types (`npm run check -w <workspace>`)
  2. run linter (`npm run lint`)
  3. run tests (`npm test -w <workspace>`)
  4. run formatter (`npm run fmt`)
- Never use the `any` type. Instead, prefer `unknown` or `never` where a narrow type cannot be provided.
- Always add non-dynamic `import` statements to the top of the file. Do not use inline imports to import type definitions.

### Additional react rules

- Make sure that added display text is translatable. We use `i18next` for translations. DO NOT translate text, but add the english labels to the translation source files. Follow existing key naming conventions and re-use common labels if possible.
- Do not use inline styles to style content. The only acceptable use for inline styles is to pass dynamic CSS variables.
