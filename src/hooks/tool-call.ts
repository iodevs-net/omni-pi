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
    ctx.ui.notify(`[Bridge] Validando impacto en: ${targetPath}`);
    
    const overview = await provider.getSymbolsOverview(targetPath);
    
    // Audit Fix #7: Regex mejorada para capturar símbolos en TypeScript/JavaScript moderno.
    const symbols = overview.split("\n")
      .map(l => {
        const specific = l.match(
          /(?:export\s+)?(?:async\s+)?(?:default\s+)?(?:abstract\s+)?(?:class|interface|function|const|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/
        )?.[1];
        if (specific) return specific;
        return l.match(/\b([A-Z][a-zA-Z0-9_]+)\b/)?.[1];
      })
      .filter(Boolean) as string[];

    const impactMap: Record<string, string[]> = {};
    for (const symbol of symbols.slice(0, 3)) {
      const refs = await provider.getIncomingReferences(symbol, targetPath);
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
      impactMessage += `\nVerifica que no estás rompiendo contratos públicos antes de proceder.`;

      // Audit Fix #8: Renombrar 'message' -> 'reason' para compatibilidad con oh-my-pi core.
      return {
        block: false, 
        reason: impactMessage
      };
    } else {
      const compressed = SemanticCompressor.compress(overview);
      return {
        block: false,
        reason: `[BRIDGE_ADVISORY] Estructura de archivo detectada:\n${compressed}`
      };
    }
  } catch (error) {
    console.error("[Bridge] Error en Análisis de Impacto:", error);
  }
}
