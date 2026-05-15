import { ToolCallEvent, ExtensionContext, HookResponse, ISemanticProvider } from "../types.js";
import { SemanticCompressor } from "../compressor.js";
import { randomUUID } from "crypto";

/**
 * Risk levels for tool operations.
 * Higher = more dangerous if it breaks external references.
 */
const RISK_MAP: Record<string, number> = {
  "safe_delete_symbol": 5,
  "delete": 5,
  "remove": 5,
  "delete_file": 5,
  "rename_symbol": 4,
  "replace_symbol_body": 4,
  "write_file": 3,
  "edit_file": 3,
  "apply_patch": 3,
  "replace_content": 3,
  "multi_replace_file_content": 3,
  "insert_after_symbol": 2,
  "insert_before_symbol": 2,
  "create_text_file": 2,
  "read_file": 1,
  "grep_files": 1,
  "file_search": 1,
};

const MAX_ADVISORY_LENGTH = 2000;
const SYMBOLS_TIMEOUT_MS = 3000;
const REFERENCES_TIMEOUT_MS = 3000;

/**
 * Hook: tool_call (Gatekeeper Semántico v3 — Deep Impact con bloqueo real)
 * 
 * Comportamiento:
 *   Riesgo >= 4 + impactos externos → BLOQUEA (block: true)
 *   Riesgo >= 3 + impactos         → ADVIERTE (block: false + advertencia)
 *   Riesgo < 3                     → PASA (return void)
 */
export async function handleToolCall(
  event: ToolCallEvent,
  ctx: ExtensionContext,
  provider: ISemanticProvider
): Promise<HookResponse | void> {
  const editTools = Object.keys(RISK_MAP);
  if (!editTools.includes(event.toolName)) return;

  const targetPath = event.input.relative_path || event.input.path || event.input.TargetFile;
  if (!targetPath) return;

  const traceId = randomUUID();
  const riskLevel = RISK_MAP[event.toolName] || 1;

  try {
    ctx.ui.notify(`[Omni-Pi] Validando impacto: ${targetPath} [${traceId.slice(0, 8)}]`);

    const overview = await Promise.race([
      provider.getSymbolsOverview(targetPath, SYMBOLS_TIMEOUT_MS),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Symbols overview timeout")), SYMBOLS_TIMEOUT_MS)
      ),
    ]);

    if (!overview) return;

    // Extraer símbolos con regex multi-lenguaje
    const symbols = overview
      .split("\n")
      .map((l: string) => {
        const specific = l.match(
          /\b(?:export\s+)?(?:async\s+)?(?:default\s+)?(?:abstract\s+)?(?:class|interface|function|const|type|enum|struct|impl)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/
        )?.[1];
        if (specific) return specific;
        return l.match(/\b([A-Z][a-zA-Z0-9_]+)\b/)?.[1];
      })
      .filter(Boolean) as string[];

    const uniqueSymbols = [...new Set(symbols)];

    // Búsqueda paralela de referencias externas
    const impactMap: Record<string, string[]> = {};
    const referencePromises = uniqueSymbols.map(async (symbol) => {
      try {
        const refs = await Promise.race([
          provider.getIncomingReferences(symbol, targetPath, REFERENCES_TIMEOUT_MS),
          new Promise<string[]>((_, reject) =>
            setTimeout(() => reject(new Error("References timeout")), REFERENCES_TIMEOUT_MS)
          ),
        ]);
        if (refs && refs.length > 0) {
          impactMap[symbol] = refs;
        }
      } catch {
        console.warn(`[Omni-Pi] Timeout refs para ${symbol}`);
      }
    });

    await Promise.all(referencePromises);
    const impactSymbols = Object.keys(impactMap);

    // ── Riesgo >= 4: BLOQUEAR si hay impactos externos ─────────
    if (riskLevel >= 4 && impactSymbols.length > 0) {
      let msg = `[🛡️ DEEP_IMPACT_BLOCKED] trace:${traceId}\n`;
      msg += `"${event.toolName}" sobre "${targetPath}" BLOQUEADO.\n`;
      msg += `Símbolos con referencias externas:\n`;
      for (const sym of impactSymbols) {
        msg += `  - "${sym}" usado en: ${impactMap[sym].join(", ")}\n`;
      }
      msg += `\nElimina las referencias primero o confirma el cambio manualmente.`;

      ctx.ui.notify("🚫 BLOQUEO POR IMPACTO");
      return { block: true, reason: msg };
    }

    // ── Riesgo >= 3: ADVERTIR ──────────────────────────────────
    if (riskLevel >= 3 && impactSymbols.length > 0) {
      let msg = `[⚠️ DEEP_IMPACT_WARNING] trace:${traceId}\n`;
      msg += `Cambios en "${targetPath}" afectan otros archivos:\n`;
      for (const sym of impactSymbols) {
        msg += `- "${sym}" usado en: ${impactMap[sym].join(", ")}\n`;
      }
      msg += `\nVerifica contratos públicos antes de proceder.`;
      if (msg.length > MAX_ADVISORY_LENGTH) msg = msg.slice(0, MAX_ADVISORY_LENGTH - 3) + "...";

      ctx.ui.notify("⚠️ ALERTA DE IMPACTO");
      return { block: false, reason: msg };
    }

    // ── Riesgo 2: información estructural ──────────────────────
    if (riskLevel >= 2) {
      const compressed = SemanticCompressor.compress(overview, MAX_ADVISORY_LENGTH);
      if (compressed === "No symbols detected.") return;
      return {
        block: false,
        reason: `[OMNI_PI_ADVISORY] trace:${traceId}\n${compressed}`,
      };
    }

    // Sin riesgo (solo lectura) — no intervenir
    return;

  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Symbols overview timeout" ||
        error.message === "References timeout"
      ) {
        console.warn(`[Omni-Pi] Timeout [${traceId}]: ${error.message}`);
      } else {
        console.error(`[Omni-Pi] Error [${traceId}]:`, error);
      }
    }
  }
}
