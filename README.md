# markdot-monorepo

Monorepo for markdot and its related packages.

## Packages

- `packages/markdot`: The core markdot tool.
- `packages/markdot-test`: Tests for markdot.

## Development

### Prerequisites

- Node.js
- pnpm
- Bun (required for building and running markdot scripts)

### Setup

```bash
pnpm install
```

### Commands

- `pnpm run build`: Build all packages.
- `pnpm run test`: Run tests.
- `pnpm run check`: Run code quality checks.
- `pnpm run ci`: Run CI checks (linting, testing, etc.).
