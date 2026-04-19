import { SerenaClient } from "../serena/client.ts";
import { SessionStartEvent, ExtensionContext } from "../types.ts";

/**
 * Hook: session_start
 * Activa Serena y asegura la indexación del proyecto al inicio.
 */
export async function handleSessionStart(
  event: SessionStartEvent,
  ctx: ExtensionContext,
  serena: SerenaClient
) {
  try {
    console.log("[Bridge] Iniciando conexión con Serena MCP...");
    await serena.connect();
    
    // El cliente de Serena ya activa el proyecto en el constructor/connect
    ctx.ui.setStatus("serena", "✅ Semántica Activa");
    console.log("[Bridge] Serena lista e indexando.");
  } catch (error) {
    console.error("[Bridge] Error al conectar con Serena:", error);
    ctx.ui.setStatus("serena", "❌ Semántica Desactivada");
  }
}
