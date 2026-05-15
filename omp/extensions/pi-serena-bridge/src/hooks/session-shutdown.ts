import { ExtensionContext, ISemanticProvider, SessionShutdownEvent } from "../types.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { randomUUID } from "crypto";

/**
 * Hook: session_shutdown
 * Libera recursos y escribe estado idle en el blackboard
 * para que otros agentes sepan que esta sesión terminó.
 */
export async function handleSessionShutdown(
  event: SessionShutdownEvent,
  ctx: ExtensionContext,
  provider: ISemanticProvider
): Promise<void> {
  try {
    ctx.ui.notify("[Bridge] Cerrando puente semántico...");

    // Write idle state to blackboard
    const BLACKBOARD_PATH =
      process.env.BLACKBOARD_PATH ||
      "/home/leonardo/harness-blackboard/state.json";

    if (existsSync(BLACKBOARD_PATH)) {
      try {
        const state = JSON.parse(readFileSync(BLACKBOARD_PATH, "utf-8"));
        state.entries["focus/current"] = {
          type: "focus",
          data: { type: "focus", value: "idle", agent: "omp" },
          trace_id: randomUUID(),
          created_at: state.entries["focus/current"]?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        state.version += 1;
        state.last_updated = new Date().toISOString();
        writeFileSync(BLACKBOARD_PATH, JSON.stringify(state, null, 2), "utf-8");
        console.log("[Blackboard] Focus marcado como idle.");
      } catch (err) {
        console.warn("[Blackboard] Error al escribir idle:", err);
      }
    }

    await provider.disconnect();
    console.log("[Bridge] Sesión finalizada correctamente.");
  } catch (error) {
    console.error("[Bridge] Error durante el cierre de sesión:", error);
  }
}
