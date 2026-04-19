import { SerenaClient } from "../serena/client.ts";
import { ContextEvent, ExtensionContext } from "../types.ts";
import { SemanticCompressor } from "../compressor.ts";

/**
 * Hook: context
 * Inyecta pistas semánticas dinámicamente si detecta intención de cambio.
 */
export async function handleContext(
  event: ContextEvent,
  ctx: ExtensionContext,
  serena: SerenaClient
) {
  const lastMessage = event.messages[event.messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") return;

  const content = typeof lastMessage.content === "string" 
    ? lastMessage.content 
    : JSON.stringify(lastMessage.content);

  // Regla LEAN: Solo inyectar si hay palabras clave de acción
  const intentKeywords = ["refactor", "change", "fix", "use", "implement", "mover", "borrar"];
  const hasIntent = intentKeywords.some(kw => content.toLowerCase().includes(kw));

  if (hasIntent) {
    try {
      console.log("[Bridge] Detectada intención semántica. Consultando Serena...");
      
      // Intentamos obtener un resumen del directorio actual (LEAN: profundidad 1)
      const symbols = await serena.getSymbolsOverview(".");
      const compressed = SemanticCompressor.compress(symbols);

      // Inyectar como mensaje de sistema invisible para el usuario pero visible para el LLM
      event.messages.unshift({
        role: "system",
        content: `[SEMANTIC_ADVISORY]\n${compressed}\nUtiliza esta información para evitar romper dependencias.`
      });
      
      console.log("[Bridge] Contexto inyectado con éxito.");
    } catch (error) {
      console.warn("[Bridge] No se pudo inyectar contexto semántico:", error);
    }
  }
}
