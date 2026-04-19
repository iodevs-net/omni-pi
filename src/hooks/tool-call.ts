import { SerenaClient } from "../serena/client.ts";
import { ToolCallEvent, ExtensionContext, HookResponse } from "../types.ts";
import { SemanticCompressor } from "../compressor.ts";

/**
 * Hook: tool_call
 * Valida ediciones antes de que se ejecuten. Actúa como Gatekeeper.
 */
export async function handleToolCall(
  event: ToolCallEvent,
  ctx: ExtensionContext,
  serena: SerenaClient
): Promise<HookResponse | void> {
  // Solo interceptamos herramientas de edición o escritura
  const writeTools = ["edit", "write", "replace_file_content", "multi_replace_file_content"];
  if (!writeTools.includes(event.toolName)) return;

  const targetPath = event.input.path || event.input.TargetFile;
  if (!targetPath) return;

  try {
    ctx.ui.notify(`[Bridge] Validando edición en: ${targetPath}`);
    
    // Consultamos a Serena por dependencias externas del archivo
    const overview = await serena.getSymbolsOverview(targetPath);
    
    // Si Serena devuelve símbolos con muchas referencias, avisar al LLM
    const compressed = SemanticCompressor.compress(overview);
    
    if (compressed.includes("- ")) {
      ctx.ui.notify("[Bridge] Detectados símbolos críticos. Inyectando advertencia.");
      return {
        block: false, 
        message: `[BRIDGE_WARNING] Estás editando un archivo con dependencias activas:\n${compressed}\nAsegúrate de que tus cambios sean compatibles.`
      };
    }
  } catch (error) {
    console.error("[Bridge] Fallo en la validación de herramienta:", error);
  }
}
