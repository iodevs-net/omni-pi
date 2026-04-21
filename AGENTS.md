# Repository Guidelines

## Project Overview
**Omni-Pi** is a Universal Semantic Intelligence Bridge for `oh-my-pi`. It provides a modular infrastructure to integrate MCP semantic servers with the coding agent session, enabling proactive context injection and impact analysis.

## Architecture & Data Flow
Omni-Pi follows a strictly decoupled layered architecture:
- **Layer A (Client Adapter)**: Manages communication with semantic providers (e.g., `SerenaClient`). Includes health checks, circuit breakers, and 10s TTL caching.
- **Layer B (Semantic Compressor)**: Implements structural prioritization to maximize token value.
- **Layer C (Hook Interceptors)**: Implements OMP native hooks (`session_start`, `context`, `tool_call`, `session_shutdown`).

Data flow:
1. OMP triggers native hooks.
2. Omni-Pi intercepts and identifies user intent.
3. Queries the `ISemanticProvider` for symbol overviews and incoming references.
4. For `context` hook: Injects system messages with structural advice.
5. For `tool_call` hook: Performs **Deep Impact Analysis**, warning or blocking based on cross-file dependencies.

## Key Directories
- `src/` - Main source code
  - `index.ts` - Entry point (HookFactory)
  - `serena/` - Serena-specific implementation
  - `hooks/` - Native OMP hook implementations
  - `types.ts` - Universal interfaces
  - `compressor.ts` - Semantic data compression logic
- `tests/` - Test files located alongside source files

## Development Commands
- `bun install` - Install dependencies
- `bun test` - Run tests
- `bun run src/index.ts` - Start the extension
- `tsc --noEmit` - Type checking

## Code Conventions & Common Patterns
- **Naming**: Every log and notification MUST be prefixed with `[Omni-Pi]`.
- **Decoupling**: All logic must depend on the `ISemanticProvider` interface, never on concrete implementations.
- **Safety**: 3s timeout for all external semantic calls.
- **Error Handling**: Graceful degradation when semantic providers are unavailable.
- **Singleton Pattern**: Shared `SerenaClient` instance during extension lifetime.
- **Event-Driven**: Uses OMP's native event system for hook interception.

## Important Files
- `src/index.ts` - Entry point that registers all hooks
- `src/types.ts` - Defines `ISemanticProvider` interface and event types
- `src/compressor.ts` - Implements structural prioritization of semantic data
- `src/hooks/` - Individual hook implementations:
  - `session-start.ts` - Initializes semantic provider connection
  - `context.ts` - Injects proactive context
  - `tool-call.ts` - Performs Deep Impact Analysis
  - `session-shutdown.ts` - Cleans up resources
- `package.json` - Defines dependencies and OMP extension configuration
- `tsconfig.json` - TypeScript configuration

## Runtime/Tooling Preferences
- **Runtime**: Bun (for package management and execution)
- **Language**: TypeScript (ES Module format)
- **Package Manager**: Bun (as specified in scripts)
- **Testing**: Bun test framework
- **Type Checking**: TypeScript `--noEmit` flag

## Testing & QA
- Test files are located alongside source files (e.g., `compressor.test.ts`)
- Run tests with `bun test`
- Tests focus on utility functions like the semantic compressor
- No mocks are used in tests to ensure real behavior validation