import { SerenaClient } from "./serena/client.js";
import { handleSessionStart } from "./hooks/session-start.js";
import { handleContext } from "./hooks/context.js";
import { handleToolCall } from "./hooks/tool-call.js";
import { handleSessionShutdown } from "./hooks/session-shutdown.js";

/**
 * Pi-Serena Semantic Bridge
 * HookFactory — contrato requerido por el sistema de extensiones de oh-my-pi.
 * 
 * Audit Fix #1: El export default DEBE ser una función que recibe la API,
 * no un objeto con métodos. Sin esto, la extensión falla al cargar silenciosamente.
 */

// Instancia única (Singleton) compartida durante toda la vida de la extensión.
const serena = new SerenaClient();

export default function(api: any) {
  // Capa 3: Inicialización del motor semántico
  api.on("session_start", (event: any, ctx: any) =>
    handleSessionStart(event, ctx, serena)
  );

  // Capa 1: Inyección de contexto semántico
  api.on("context", (event: any, ctx: any) =>
    handleContext(event, ctx, serena)
  );

  // Capa 2: Gatekeeper de ediciones (Deep Impact Analysis)
  api.on("tool_call", (event: any, ctx: any) =>
    handleToolCall(event, ctx, serena)
  );

  // Limpieza de recursos al cerrar sesión
  api.on("session_shutdown", (event: any, ctx: any) =>
    handleSessionShutdown(event, ctx, serena)
  );

  console.log("[Bridge] Extensión pi-serena-bridge registrada correctamente.");
}
