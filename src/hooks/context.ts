import type { ContextEvent, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { SerenaClient } from "../serena/client.ts";
import { compressSerenaResponse } from "../compressor.ts";

export async function handleContext(
  event: ContextEvent,
  ctx: ExtensionContext,
  serena: SerenaClient
) {
  // Check if the last user message implies an edit
  const lastMessage = event.messages[event.messages.length - 1];
  if (lastMessage?.role !== "user") return undefined;

  const content = lastMessage.content;
  if (typeof content !== "string") return undefined;

  // Simple heuristic: if user says "refactor" or "edit" or "change"
  const keywords = ["refactor", "edit", "change", "fix", "modify"];
  if (!keywords.some(k => content.toLowerCase().includes(k))) return undefined;

  // Try to find symbols related to the prompt (simplified)
  // In a real implementation, we would extract symbol names from the prompt
  
  // For now, let's just return a placeholder to prove injection works
  return {
    messages: [
      ...event.messages,
      {
        role: "system",
        content: "💡 [Serena] Semantic context active. I will validate your edits against the project graph.",
        timestamp: Date.now()
      }
    ]
  };
}
