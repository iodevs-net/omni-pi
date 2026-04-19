import { ExtensionContext, ISemanticProvider, SessionShutdownEvent } from "../types.js";

/**
 * Hook: session_shutdown
 * Libera recursos de forma agnóstica.
 * Audit Fix #4: Añadir parámetro 'event' para consistencia con la API de oh-my-pi.
 */
export async function handleSessionShutdown(
  event: SessionShutdownEvent,
  ctx: ExtensionContext, 
  provider: ISemanticProvider
): Promise<void> {
  try {
    ctx.ui.notify("[Bridge] Cerrando puente semántico...");
    await provider.disconnect();
    console.log("[Bridge] Sesión finalizada correctamente.");
  } catch (error) {
    console.error("[Bridge] Error durante el cierre de sesión:", error);
  }
}
