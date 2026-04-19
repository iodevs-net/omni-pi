import type { HookAPI } from "@oh-my-pi/pi-coding-agent";
import { handleToolCall } from "./hooks/tool-call.ts";
import { handleContext } from "./hooks/context.ts";
import { handleSessionStart } from "./hooks/session-start.ts";
import { SerenaClient } from "./serena/client.ts";

export default function (api: HookAPI) {
  // Initialize Serena Client with project CWD
  // Note: we'll refine how to get the project path
  const serena = new SerenaClient(process.cwd());

  // Register Hooks
  api.on("session_start", (event, ctx) => handleSessionStart(event, ctx, serena));
  
  api.on("context", (event, ctx) => handleContext(event, ctx, serena));

  api.on("tool_call", (event, ctx) => handleToolCall(event, ctx, serena));
  
  api.on("session_shutdown", async () => {
    await serena.disconnect();
  });
}
