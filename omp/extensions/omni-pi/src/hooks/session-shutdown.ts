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
    ctx.ui.notify("[Omni-Pi] Cerrando puente semántico...");
    await provider.disconnect();
    console.log("[Omni-Pi] Sesión finalizada correctamente.");
  } catch (error) {
    console.error("[Omni-Pi] Error durante el cierre de sesión:", error);
  }
}
