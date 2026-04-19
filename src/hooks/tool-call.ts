import type { ExtensionContext, ToolCallEvent } from "@oh-my-pi/pi-coding-agent";
import { SerenaClient } from "../serena/client.ts";

export async function handleToolCall(
  event: ToolCallEvent,
  ctx: ExtensionContext,
  serena: SerenaClient
) {
  if (event.toolName !== "edit") return undefined;

  const { path, loc } = event.input as { path: string; loc?: string };
  if (!path) return undefined;

  // 1. Resolve symbol at loc via Serena
  // For now, we assume Serena can help us find what's at that location
  // or we just check the impact of changing that file.
  
  try {
    const overview = await serena.getSymbolsOverview(path);
    // Logic to find which symbol is at 'loc' line
    // ...
    
    // 2. Validate impact
    // If we detect a breaking change, we can block it
    /*
    return {
      block: true,
      reason: "This edit breaks 'routes.ts:45'. Please update the caller first."
    };
    */
  } catch (err) {
    console.error("Serena validation failed:", err);
  }

  return undefined; // Let it pass
}
