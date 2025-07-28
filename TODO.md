# Tower TODO

## Completed

- Set up minimal Bun test runner
- Write comprehensive tests for CLI commands using functional core pattern
- Refactor Note functions to be testable (pure functions with dependency injection)
- Add `tower add` command with git-style interface (`tower add` opens editor, `tower add -m "content"` for quick notes)
- Add `tower search "query"` command for content search
- Consolidate add/create into unified interface

## Next Up

- Set up basic API server with Hono and health check endpoint
- Implement server-side auth (TDD) - register, login, JWT tokens
- Implement client-side auth - store tokens, login/logout commands
- Basic sync implementation - simple last-write-wins between client and server

## Future

- Mobile/Web clients
- Background sync daemon
- Advanced conflict resolution
