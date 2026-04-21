import { ToolCallEvent, ExtensionContext, HookResponse, ISemanticProvider } from "../types.js";
import { SemanticCompressor } from "../compressor.js";

/**
 * Hook: tool_call (Gatekeeper Semántico v2 - Deep Impact)
 * Intercepta ediciones y valida contra el grafo de dependencias externo.
 */
export async function handleToolCall(
  event: ToolCallEvent,
  ctx: ExtensionContext,
  provider: ISemanticProvider
): Promise<HookResponse | void> {
  const editTools = ["replace_content", "write_file", "edit_file", "replace_symbol_body", "multi_replace_file_content"];
  if (!editTools.includes(event.toolName)) return;

  const targetPath = event.input.relative_path || event.input.path || event.input.TargetFile;
  if (!targetPath) return;

  try {
    ctx.ui.notify(`[Omni-Pi] Validando impacto en: ${targetPath}`);

    const overview = await provider.getSymbolsOverview(targetPath, 3000);

    // Audit Fix #7: Regex mejorada para capturar símbolos en TypeScript/JavaScript moderno.
    const symbolsRaw = await Promise.race([
      provider.getSymbolsOverview(targetPath, 3000),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Symbols overview timeout')), 3000))
    ]);

    const symbols = (symbolsRaw).split("\n")
      .map((l: string) => {
        const specific = l.match(
          /\b(?:export\s+)?(?:async\s+)?(?:default\s+)?(?:abstract\s+)?(?:class|interface|function|const|type|enum|struct|impl)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
        )?.[1];
        if (specific) return specific;
        return l.match(/\b([A-Z][a-zA-Z0-9_]+)\b/)?.[1];
      })
      .filter(Boolean) as string[];

    // Limitar análisis a los símbolos que caben en el límite de caracteres
    const headerSize = "[OMNI_PI_ADVISORY] Estructura de archivo detectada:\n".length;
    const maxChars = SemanticCompressor.MAX_CHARS - headerSize;
    const impactMap: Record<string, string[]> = {};

    for (const symbol of symbols) {
      const refs = await Promise.race([
        provider.getIncomingReferences(symbol, targetPath, 3000),
        new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error('References timeout')), 3000))
      ]);

      if (refs.length > 0) {
        impactMap[symbol] = refs;
      }
    }

    const impactSymbols = Object.keys(impactMap);
    if (impactSymbols.length > 0) {
      ctx.ui.notify("⚠️ ¡ALERTA DE IMPACTO DETECTADA!");

      let impactMessage = `[🛡️ DEEP_IMPACT_WARNING] Tus cambios en "${targetPath}" afectan a otros archivos:\n`;
      for (const symbol of impactSymbols) {
        impactMessage += `- Símbolo "${symbol}" es usado en: ${impactMap[symbol].join(", ")}\n`;
      }
      // Truncar si excede límite
      if (impactMessage.length > 2000) {
        impactMessage = impactMessage.substring(0, 1997) + "...";
      }
      return {
        modifiedMessages: [{
          role: "system",
          content: impactMessage
        }],
        block: false
      };
    } else {
      const compressed = SemanticCompressor.compress(overview as string, maxChars);
      return {
        modifiedMessages: [{
          role: "system",
          content: `[OMNI_PI_ADVISORY] Estructura de archivo detectada:\n${compressed}`
        }],
        block: false
      };
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Symbols overview timeout' || error.message === 'References timeout') {
        console.warn("[Omni-Pi] Timeout al obtener información de símbolos");
      } else {
        console.error("[Omni-Pi] Error en Análisis de Impacto:", error);
      }
    } else {
      console.error("[Omni-Pi] Error desconocido en análisis de impacto:", error);
    }
  }
}