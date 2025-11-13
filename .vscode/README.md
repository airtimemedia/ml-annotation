# VS Code Configuration

This directory contains VS Code workspace configuration for running both projects.

## Tasks

Run tasks via `Terminal > Run Task` or `Cmd/Ctrl + Shift + P` → `Tasks: Run Task`:

### Lipsync Videos
- `lipsync: dev` - Start dev server (port 5173)
- `lipsync: build` - Build for production
- `lipsync: preview` - Preview production build
- `lipsync: lint` - Run ESLint

### Intent Requests
- `intent: dev` - Start dev server (port 5174)
- `intent: build` - Build for production
- `intent: preview` - Preview production build
- `intent: lint` - Run ESLint

### Combined
- `all: dev` - Run both dev servers
- `all: build` - Build both projects
- `all: lint` - Lint both projects

## Port Configuration

- **Lipsync Videos**: http://localhost:5175
- **Intent Requests**: http://localhost:5176

## Settings

The workspace includes:
- Auto-formatting on save
- ESLint auto-fix on save
- Import organization on save
- TypeScript project references
- Search exclusions for node_modules and dist folders

## Recommended Extensions

Install recommended extensions when prompted, or manually install:
- ESLint
- Prettier
- TypeScript support
- GitLens

## Troubleshooting

**Dev server won't start**:
- Check that ports 5175/5176 are available
- Run `npm install` in each project folder

**TypeScript errors**:
- Run `npm install` in each project folder
- Reload VS Code window
