# Agent Guidelines for Tower

## Build/Test Commands

- `bun run start` - Run the CLI application
- `bun run format` - Format code with Prettier
- `bun test` - Run tests (when added)
- `bun test <file>` - Run single test file

## Code Style

- Use TypeScript with strict mode enabled
- Prefer `Bun.file()` over `node:fs` for file operations
- Import style: ES modules only, prefer named imports
- Use namespace exports for related functionality (see `Note` and `Config`)
- File structure: Keep related functionality in namespaces, separate concerns by file
- Prefer `await` over `.then()` for async operations
