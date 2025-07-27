# Agent Guidelines for Tower

## Project Management

### Required Reading

1. `TODO.md` - Check current implementation status and next priorities
2. `README.md` - Basic project setup and usage instructions

### TODO Management

- Always update `TODO.md` when starting work on a task
- Mark tasks as completed immediately when finished
- Add new tasks as they're discovered during implementation
- Use clear status indicators: Completed, In Progress, Next Up, Future
- Add implementation notes for context and decisions made

## Project Vision & Architecture

### Local-First Philosophy

- Users can start taking notes immediately on any platform, completely offline
- No account required to begin using the app
- Data remains accessible even without internet connection
- Sync is optional enhancement, not a requirement

### Multi-Platform Strategy

- CLI: Primary focus, stores notes as plain text files
- Mobile: React Native app (future)
- Web: Browser-based app (future)
- Shared codebase: Maximum code reuse between all clients

### Note-Taking Philosophy

- Short and atomic notes: Focus on quick, simple note capture
- Append-only workflow: Notes are added chronologically
- Content over organization: Users focus on writing, not file management
- Greppable data: CLI users can use standard Unix tools on their notes

### Storage Strategy

- CLI: Plain text files in `~/.tower/notes/` (user-accessible, greppable)
- Metadata: SQLite database in `~/.tower/.meta/` (hidden, for sync state)
- Mobile/Web: Any appropriate storage format (not constrained to plain text)
- Inspired by Obsidian: Plain files + hidden metadata folder approach

### File Organization

- Automatic naming: Timestamp-based filenames (e.g., `1753506609133.txt`) for chronological ordering and unique identification
- No user file management: Users never think about filenames or directories
- Directory structure: `~/.tower/notes/` for content, `~/.tower/.meta/` for system data

### Sync Architecture

- Optional sync server: Central Hono-based API for device synchronization
- Conflict resolution: Start with last-write-wins, explore CRDTs later
- Future background sync: System service (systemd/launchd) for automatic syncing
- Manual sync initially: `tower sync` command to start

### Authentication Design

- Username/password: Simple auth to start
- OAuth future: GitHub/Google login as future enhancement
- JWT tokens: Stateless authentication for API
- Persistent auth: CLI stores tokens locally for seamless experience

## Development Guidelines

### Code Style

- No premature abstraction - keep the code as simple possible
- Start minimal - add complexity only when needed
- Add dependencies/infrastructure only when actually required for the current task
- Functional approach inspired by Elixir - modules (namespaces in TS) and functions
- Use namespace exports for related functionality (see `Note` and `Config`)
- File structure: Keep related functionality in namespaces, separate concerns by file
- No `as any` - maintain strict type safety
- Test-driven development - write tests before implementation when possible
- Use TypeScript with strict mode enabled
- Prefer `Bun.file()` over `node:fs` for file operations
- Import style: ES modules only, prefer named imports
- Prefer `await` over `.then()` for async operations

### Technology Constraints

- Bun for everything - runtime, testing, package management
- Hono + RPC for API with type-safe client-server communication
- SQLite + Drizzle for database with proper migrations
- No raw SQL - use Drizzle ORM throughout

## Current Focus

### Key Principles

- Local-first - everything works offline
- Plain text CLI - users can grep their data
- Optional sync - never required for basic functionality
- Simple conflict resolution - last-write-wins to start

### CLI Command Design

Core Commands

- `tower add "content"` - Create new note with given content
- `tower list` / `tower ls` - List recent notes with previews
- `tower search "query"` - Search notes by content
- `tower rm <note-id>` - Delete specific note
- `tower new` - Open editor for longer note creation

Auth Commands

- `tower auth` - Login or register with sync server
- `tower logout` - Clear stored authentication

Sync Commands (planned)

- `tower sync` - Manual synchronization with server
- Future: Background daemon for automatic sync

### Sync Strategy

Conflict Resolution Philosophy

- Start simple: Last-write-wins for initial implementation
- Future exploration: CRDTs for true conflict-free replication
- Atomic notes reduce conflicts: Short notes minimize simultaneous editing

Sync Flow Design

- Single endpoint: `POST /sync` handles entire sync process
- Bidirectional: Client sends changes, receives updates in one request
- Server-side resolution: All conflict handling happens on server
- Timestamp-based: Track creation, modification, and sync times

### Testing Strategy

Test-First Development

- Write tests before implementation when possible
- Comprehensive coverage for all functionality
- Isolated test environments to prevent interference

E2E Focus for Sync

- End-to-end tests for sync correctness
- Conflict resolution scenario testing
- Multi-device simulation tests

Bun Testing

- Use Bun's built-in test runner throughout
- Fast feedback loop for development
- Integrated with monorepo structure

## Implementation Priority

1. Local CLI functionality - Core note-taking without sync
2. Authentication system - User accounts and JWT tokens
3. Sync implementation - Server endpoints and CLI sync command
4. Mobile/Web clients - Extend to other platforms
5. Background sync - Automatic synchronization daemon
6. Advanced conflict resolution - Explore CRDTs and better merging

## Build/Test Commands

- `bun run start` - Run the CLI application
- `bun run cli` - Convenient alias for CLI
- `bun run typecheck` - Check TypeScript across all packages
- `bun run format` - Format code with Prettier
- `bun test` - Run tests (when added)
- `bun test <file>` - Run single test file

---

Remember: Read TODO.md for current status and next priorities.
