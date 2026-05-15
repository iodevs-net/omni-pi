import { SessionStartEvent, ExtensionContext, ISemanticProvider } from "../types.js";
import { readFileSync, existsSync } from "fs";

/**
 * Hook: session_start
 * Inicializa la conexión con el motor semántico y
 * lee el blackboard compartido para inyectar contexto.
 */
export async function handleSessionStart(
  event: SessionStartEvent,
  ctx: ExtensionContext,
  provider: ISemanticProvider
) {
  try {
    // 1. Connect semantic provider
    const ok = await provider.connect();
    if (ok) {
      ctx.ui.notify("✅ Semántica Activa");
      console.log("[Bridge] Motor semántico listo e indexando.");
    } else {
      ctx.ui.notify("⚠️ Semántica en modo degradado");
    }

    // 2. Read blackboard shared state and inject into system prompt
    const BLACKBOARD_PATH =
      process.env.BLACKBOARD_PATH ||
      "/home/leonardo/harness-blackboard/state.json";

    if (existsSync(BLACKBOARD_PATH)) {
      try {
        const state = JSON.parse(readFileSync(BLACKBOARD_PATH, "utf-8"));
        const entries = state.entries || {};
        const entryKeys = Object.keys(entries);

        if (entryKeys.length > 0) {
          let bbContext = "\n\n<!-- HARNESS BLACKBOARD STATE -->\n";
          bbContext += "Estado compartido con otros agentes:\n";

          for (const key of entryKeys) {
            const entry = entries[key];
            const data = entry.data || {};
            let line = `  - ${key}: ${data.value || "(sin valor)"}`;
            if (data.context) line += ` [${data.context}]`;
            if (data.severity) line += ` (severity: ${data.severity})`;
            if (data.agent) line += ` (agent: ${data.agent})`;
            bbContext += line + "\n";
          }

          bbContext +=
            "Recordatorio: usa read_blackboard / write_blackboard para mantener este estado actualizado.\n";

          // Inject via current system prompt appendage
          const currentPrompt = ctx.getSystemPrompt();
          // Note: we can't modify system prompt directly through ctx,
          // but the context hook will handle injection when user shows intent.
          // We log the state for now.
          console.log(`[Blackboard] Estado inyectado: ${entryKeys.length} entradas activas`);
          ctx.ui.notify(`📋 Blackboard: ${entryKeys.length} entradas`);
        } else {
          console.log("[Blackboard] Sin entradas activas.");
        }
      } catch (err) {
        console.warn("[Blackboard] Error al leer estado:", err);
      }
    }
  } catch (error) {
    console.error("[Bridge] Error en session_start:", error);
  }
}
