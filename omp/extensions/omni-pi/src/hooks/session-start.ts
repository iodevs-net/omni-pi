import { SessionStartEvent, ExtensionContext, ISemanticProvider } from "../types.js";

/**
 * Hook: session_start
 * Inicializa la conexión con el motor semántico.
 */
export async function handleSessionStart(
  event: SessionStartEvent,
  ctx: ExtensionContext,
  provider: ISemanticProvider
): Promise<void> {
  try {
    const connected = await Promise.race([
      provider.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 3000))
    ]);

    if (connected) {
      ctx.ui.notify("✅ [Omni-Pi] Semántica Activa");
      console.log("[Omni-Pi] Motor semántico listo e indexando.");
    } else {
      ctx.ui.notify("⚠️ [Omni-Pi] Semántica en modo degradado");
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Connection timeout') {
        ctx.ui.notify("⚠️ [Omni-Pi] Semántica en modo degradado (timeout)");
        console.warn("[Omni-Pi] Timeout al conectar con el motor semántico");
      } else {
        ctx.ui.notify("⚠️ [Omni-Pi] Semántica en modo degradado");
        console.error("[Omni-Pi] Error al conectar con el motor semántico:", error);
      }
    } else {
      ctx.ui.notify("⚠️ [Omni-Pi] Semántica en modo degradado (error desconocido)");
      console.error("[Omni-Pi] Error desconocido al conectar:", error);
    }
  }
}