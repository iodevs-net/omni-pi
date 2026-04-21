import { ContextEvent, ExtensionContext, ISemanticProvider, ContextEventResult } from "../types.js";
import { SemanticCompressor } from "../compressor.js";

/**
 * Hook: context
 * Inyecta semántica cuando el usuario muestra intención de modificar código.
 * Audit Fix #5: Retornar resultado en lugar de mutar el evento.
 */
export async function handleContext(
  event: ContextEvent, 
  ctx: ExtensionContext, 
  provider: ISemanticProvider
): Promise<ContextEventResult | void> {
  const lastMessage = event.messages[event.messages.length - 1];
  if (lastMessage?.role !== "user" || !lastMessage.content) return;

  // Manejar contenido que puede ser string o Array de partes
  const rawContent = Array.isArray(lastMessage.content) 
    ? lastMessage.content.map((p: any) => ("text" in p ? p.text : "")).join(" ")
    : String(lastMessage.content);

  const content = rawContent.toLowerCase();

  // Palabras clave de intención mejoradas
  const intents = [
    "refactor", "cambiar", "change", "fix", "arreglar", "use", "usar", 
    "implement", "implementar", "mover", "move", "borrar", "delete", 
    "update", "actualizar", "modify", "modificar", "optimizar", "optimize",
    "analiza", "resumen", "explica", "qué hace", "contexto", "revisar", "cómo", "por qué"
  ];
  
  const hasIntent = intents.some(intent => content.includes(intent));

  if (hasIntent) {
    try {
      // Extraer path con soporte para rutas complejas y espacios
      const pathMatch = rawContent.match(/(?:ruta|path|file|archivo|location)\s*[:=]\s*['"`]?([^'"`\s;.,!?]+(?:\.[a-zA-Z0-9]+)*)/i) ||
                        rawContent.match(/['"`]([^'"`]+\.(ts|js|tsx|jsx|py|go|rs|java|cs))['"`]/);
      const targetPath = pathMatch?.[1] || ".";

      ctx.ui.notify(`[Omni-Pi] Analizando semántica de: ${targetPath}`);

      // Calcular límite de caracteres para símbolos (reservando espacio para encabezado)
      const maxChars = SemanticCompressor.MAX_CHARS - "[OMNI_PI_ADVISORY] Estructura de archivo detectada:\n".length;

      const symbolsString = await Promise.race([
        provider.getSymbolsOverview(targetPath, 3000),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Symbols timeout')), 3000))
      ]);

      if (!symbolsString || symbolsString.length < 5) return;

      const compressed = SemanticCompressor.compress(symbolsString, maxChars);

      const semanticAdvisory = `
### 🛡️ SEMANTIC_ARCHITECT_ADVISORY
The following project symbols were detected. Use this as a reference to ensure architectural integrity:
\`\`\`text
${compressed}
\`\`\`
*Review references before refactoring any of these symbols.*`;

      // Audit Fix #5: Retornar el mensaje del sistema para inyección limpia.
      return {
        messages: [{
          role: "system",
          content: semanticAdvisory
        }]
      };
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Symbols timeout') {
          console.warn("[Omni-Pi] Timeout al obtener símbolos");
        } else {
          console.warn("[Omni-Pi] Salto de inyección semántica:", error);
        }
      } else {
        console.warn("[Omni-Pi] Error desconocido en inyección semántica:", error);
      }
    }
  }
}