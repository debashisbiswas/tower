# Tower TODO

## Completed

- Set up minimal Bun test runner
- Write comprehensive tests for CLI commands using functional core pattern
- Refactor Note functions to be testable (pure functions with dependency injection)
- Add `tower add` command with git-style interface (`tower add` opens editor, `tower add -m "content"` for quick notes)
- Add `tower search "query"` command for content search
- Consolidate add/create into unified interface
- Set up basic API server with Hono and health check endpoint
- Implement server-side auth (TDD) - register, login, JWT tokens with username/password only
- Refactor refresh token system for multi-device support
- Add comprehensive auth tests (logout, multi-device, token rotation, expired tokens)
- Implement proper refresh token storage with separate table
- Add logout endpoint for token invalidation
- Improve time-based testing with dependency injection
- Implement client-side auth with CLI commands (auth, logout, whoami)
- Add comprehensive auth tests with proper isolation
- Create secure token storage in ~/.tower/.auth/tokens.json
- Add interactive auth flow with password masking
- Integrate auth system with existing CLI architecture

## Next Up

- Basic sync implementation - simple last-write-wins between client and server

## Future

- Mobile/Web clients
- Background sync daemon
- Advanced conflict resolution
