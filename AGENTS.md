# Repository Guidelines

## Project Overview
pi-serena-bridge is a Native Semantic Bridge for oh-my-pi and Serena MCP. It acts as an extension that integrates the Serena MCP server with the oh-my-pi coding agent system to provide semantic-aware code modifications. The bridge detects user intent to modify code and injects contextual information from Serena to help prevent breaking changes.

## Architecture & Data Flow
The bridge follows a layered architecture:
- **Layer A**: Serena Client adapter (manages MCP connection with timeouts)
- **Layer B**: Semantic Compressor (processes Serena's symbol data)
- **Layer C**: Hook Interceptors (oh-my-pi hook implementations)

Data flow:
1. oh-my-pi triggers hooks (session_start, context, tool_call, session_shutdown)
2. Bridge intercepts relevant hooks
3. For context and tool_call hooks, it queries Serena MCP server
4. Serena returns symbol overviews/references
5. Bridge compresses and formats this data
6. For context hook: injects as system message
7. For tool_call hook: returns warning or blocks if critical dependencies detected

## Key Directories
- `src/` - Main source code
  - `index.ts` - Extension entry point
  - `serena/` - Serena MCP client implementation
  - `hooks/` - oh-my-pi hook implementations
  - `types.ts` - TypeScript interfaces for hooks
  - `compressor.ts` - Semantic data compression utility
- `.omp/extensions/pi-serena-bridge/` - Duplicate source for oh-my-pi extension loading
- `contexto/` - Documentation files about the project

## Development Commands
- Install dependencies: `bun install`
- Type checking: `bun run check` (runs `tsc --noEmit`)
- Run extension: `bun run src/index.ts` (though typically loaded by oh-my-pi)
- No explicit test command configured

## Code Conventions & Common Patterns
- **TypeScript**: Strict mode with ES modules (`"type": "module"` in package.json)
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces
- **Error Handling**: Try/catch blocks with specific error messages and logging
- **Async/Await**: Used for all MCP server communications
- **Timeouts**: 10-second timeout for Serena tool calls (Regla de Oro 3)
- **Dependency Injection**: SerenaClient passed to hook handlers
- **Null Checks**: Explicit null checks before MCP client usage
- **Constants**: Timeout values defined as class constants

## Important Files
- `src/index.ts` - Main extension entry point, registers all hooks
- `src/serena/client.ts` - Manages MCP connection to Serena server
- `src/hooks/context.ts` - Injects semantic advice when user shows modification intent
- `src/hooks/tool-call.ts` - Validates edits against Serena symbol references (Gatekeeper)
- `src/hooks/session-start.ts` - Initializes Serena client on session start
- `src/hooks/session-shutdown.ts` - Cleans up Serena connection on session end
- `src/types.ts` - Shared TypeScript interfaces for hook events
- `src/compressor.ts` - Compresses Serena symbol data for injection
- `package.json` - Defines dependencies, scripts, and extension configuration
- `tsconfig.json` - TypeScript configuration

## Runtime/Tooling Preferences
- **Runtime**: Bun v1.3.11+ (fast all-in-one JavaScript runtime)
- **Package Manager**: Bun (implicit from usage)
- **TypeScript**: Version 5.0.0+
- **MCP SDK**: @modelcontextprotocol/sdk ^1.6.0
- **No test framework configured**
- **Build**: TypeScript compilation via `tsc --noEmit`

## Testing & QA
- No test files found in the repository
- Type checking serves as primary quality gate: `bun run check`
- Manual verification through oh-my-pi integration
- Error logging to console for debugging purposes