import { ContextEvent, ExtensionContext, ISemanticProvider, ContextEventResult } from "../types.js";
import { SemanticCompressor } from "../compressor.js";
import { randomUUID } from "crypto";

/**
 * Hook: context
 * Inyecta semántica cuando el usuario muestra intención de modificar código.
 * v3: incluye trace_id para trazabilidad.
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

  // Diccionario de intención expandido (cubre casos de tests reales)
  const intents = [
    "refactor", "chang", "fix", "optimiz", "analy", "expl", "haz", "arregl",
    "cómo", "qué hace", "bug", "error", "corríg", "actualiz", "updat", "edit",
    "muest", "show", "dime", "tell", "implement", "implementar", "delete",
    "mover", "move", "borrar", "modify", "modificar",
  ];

  const hasIntent = intents.some((i) => content.includes(i));

  if (hasIntent) {
    const traceId = randomUUID();

    // Extracción de Path mejorada
    const pathMatch = rawContent.match(/['"`]?([a-zA-Z0-9_/.-]+\.[a-z]{2,4})['"`]?/i);
    const targetPath = pathMatch ? pathMatch[1] : ".";

    try {
      ctx.ui.notify(`[Omni-Pi] Semántica: ${targetPath} [${traceId.slice(0, 8)}]`);

      const symbols = await provider.getSymbolsOverview(targetPath, 3000);
      if (!symbols || symbols.includes("Error")) return;

      const compressed = SemanticCompressor.compress(symbols, 2000);
      if (compressed === "No symbols detected.") return;

      return {
        messages: [
          {
            role: "system",
            content: `### 🛡️ SEMANTIC_ADVISORY [trace:${traceId}] (${targetPath})\n\`\`\`text\n${compressed}\n\`\`\``,
          },
        ],
      };
    } catch {
      // Fallback silencioso para no bloquear el flujo principal
      return;
    }
  }
}
