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
    ctx.ui.notify(`[Bridge] Iniciando Análisis de Impacto Profundo...`);
    
    // 1. Obtener símbolos locales para identificar qué se está tocando
    const overview = await provider.getSymbolsOverview(targetPath);
    const symbols = overview.split("\n")
      .filter(l => l.includes("export") || l.includes("class") || l.includes("interface"))
      .map(l => l.match(/(?:export\s+)?(?:class|interface|function|const)\s+([a-zA-Z0-9_]+)/)?.[1])
      .filter(Boolean) as string[];

    // 2. Rastrear impacto en archivos externos (limitado a los top 3 para performance)
    const impactMap: Record<string, string[]> = {};
    for (const symbol of symbols.slice(0, 3)) {
      const refs = await provider.getIncomingReferences(symbol, targetPath);
      if (refs.length > 0) {
        impactMap[symbol] = refs;
      }
    }

    // 3. Generar reporte de impacto
    const impactSymbols = Object.keys(impactMap);
    if (impactSymbols.length > 0) {
      ctx.ui.notify("⚠️ ¡ALERTA DE IMPACTO DETECTADA!");
      
      let impactMessage = `[🛡️ DEEP_IMPACT_WARNING] Tus cambios en "${targetPath}" afectan a otros archivos:\n`;
      for (const symbol of impactSymbols) {
        impactMessage += `- Símbolo "${symbol}" es usado en: ${impactMap[symbol].join(", ")}\n`;
      }
      impactMessage += `\nVerifica que no estás rompiendo contratos públicos antes de proceder.`;

      return {
        block: false, 
        message: impactMessage
      };
    } else {
      // Fallback al aviso semántico estándar si no hay referencias externas claras
      const compressed = SemanticCompressor.compress(overview);
      return {
        block: false,
        message: `[BRIDGE_ADVISORY] Estructura de archivo detectada:\n${compressed}`
      };
    }
  } catch (error) {
    console.error("[Bridge] Error en Análisis de Impacto:", error);
  }
}
