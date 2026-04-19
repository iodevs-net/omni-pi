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
  if (lastMessage?.role !== "user") return;

  const intents = [
    "refactor", "cambiar", "change", "fix", "arreglar", "use", "usar", 
    "implement", "implementar", "mover", "move", "borrar", "delete", 
    "update", "actualizar", "modify", "modificar", "optimizar", "optimize"
  ];
  
  const content = lastMessage.content.toLowerCase();
  const hasIntent = intents.some(intent => content.includes(intent));

  if (hasIntent) {
    try {
      // Audit Fix #6: Intentar extraer un path de archivo del mensaje del usuario para mayor precisión.
      const pathMatch = lastMessage.content.match(/['"`]([^'"`]+\.(ts|js|tsx|jsx|py|go|rs|java|cs))[`'"]/);
      const targetPath = pathMatch?.[1] || ".";

      ctx.ui.notify(`[Omni-Pi] Analizando semántica de: ${targetPath}`);
      
      const symbols = await provider.getSymbolsOverview(targetPath);
      if (!symbols || symbols.length < 10) return;

      const compressed = SemanticCompressor.compress(symbols);

      const semanticAdvisory = `
### 🛡️ SEMANTIC_ARCHITECT_ADVISORY
The following project symbols were detected. Use this as a reference to ensure architectural integrity:
\`\`\`text
${compressed}
\`\`\`
*Review references before refactoring any of these symbols.*
`.trim();

      // Audit Fix #5: Retornar el mensaje del sistema para inyección limpia.
      return {
        messages: [{
          role: "system",
          content: semanticAdvisory
        }]
      };
      
    } catch (error) {
      console.warn("[Omni-Pi] Salto de inyección semántica:", error);
    }
  }
}
