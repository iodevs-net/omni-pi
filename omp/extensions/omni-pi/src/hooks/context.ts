import { ContextEvent, ExtensionContext, ISemanticProvider, ContextEventResult } from "../types.js";
import { SemanticCompressor } from "../compressor.js";

/**
 * Hook: context
 * Inyecta semántica cuando el usuario muestra intención de modificar código.
 * Implementación de Alto Espectro (Refactoreada para cubrir casos de corrección de bugs).
 */
export async function handleContext(
  event: ContextEvent, 
  ctx: ExtensionContext, 
  provider: ISemanticProvider
): Promise<ContextEventResult | void> {
  const lastMessage = event.messages[event.messages.length - 1];
  if (!lastMessage || !lastMessage.content) return;

  const rawContent = String(lastMessage.content);
  const content = rawContent.toLowerCase();

  // Diccionario de intención expandido (Cubriendo requerimientos de tests reales)
  const intents = [
    "refactor", "chang", "fix", "optimiz", "analy", "expl", "haz", "arregl", 
    "cómo", "qué hace", "bug", "error", "corríg", "actualiz", "updat", "edit",
    "muest", "show", "dime", "tell"
  ];
  
  const hasIntent = intents.some(i => content.includes(i));

  if (hasIntent) {
    // Extracción de Path mejorada para capturar archivos en cualquier parte del string
    const pathMatch = rawContent.match(/['"`]?([a-zA-Z0-9_/.-]+\.[a-z]{2,4})['"`]?/i);
    const targetPath = pathMatch ? pathMatch[1] : ".";

    try {
      ctx.ui.notify(`[Omni-Pi] Semántica: ${targetPath}`);
      const symbols = await provider.getSymbolsOverview(targetPath, 3000);
      
      if (!symbols || symbols.includes("Error")) return;

      const compressed = SemanticCompressor.compress(symbols, 2000);
      if (compressed === "No symbols detected.") return;

      return {
        messages: [{
          role: "system",
          content: `### 🛡️ SEMANTIC_ADVISORY (${targetPath})\n\`\`\`text\n${compressed}\n\`\`\``
        }]
      };
    } catch (e) {
      // Fallback silencioso para no bloquear el flujo principal de oh-my-pi
      return;
    }
  }
}
