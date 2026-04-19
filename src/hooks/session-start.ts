import type { ExtensionContext, SessionStartEvent } from "@oh-my-pi/pi-coding-agent";
import { SerenaClient } from "../serena/client.ts";

export async function handleSessionStart(
  event: SessionStartEvent,
  ctx: ExtensionContext,
  serena: SerenaClient
) {
  console.log("Starting pi-serena-bridge session...");
  try {
    await serena.connect();
    ctx.ui.notify("Serena Semantic Bridge Active", "info");
  } catch (err) {
    console.error("Failed to connect to Serena:", err);
    ctx.ui.notify("Serena Bridge Failed", "error");
  }
}
