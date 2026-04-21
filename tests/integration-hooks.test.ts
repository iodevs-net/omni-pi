import { expect, test, describe, mock } from "bun:test";
import { handleContext } from "../src/hooks/context.js";
import { handleToolCall } from "../src/hooks/tool-call.js";
import { ISemanticProvider } from "../src/types.js";

describe("📡 Semantic Gatekeeper INTEGRATION & MOCK_GRAFOS", () => {
  
  const mockUI = { notify: mock(() => {}) };
  const mockCtx = { ui: mockUI, cwd: ".", getContextUsage: () => ({}), hasUI: true, isIdle: () => true, getSystemPrompt: () => "" } as any;

  const mockProvider: ISemanticProvider = {
    connect: async () => true,
    disconnect: async () => {},
    getSymbolsOverview: async (path) => {
      // Responder con símbolos válidos para cualquier path solicitado en los tests
      if (path === "broken.ts") return "export class BreakingChange {}";
      return "export const MockSymbol = 1;\nclass MockInternal {}";
    },
    getIncomingReferences: async (symbol, path) => {
      // Simular un impacto real: BreakingChange es usado por main.ts y api.ts
      if (symbol === "BreakingChange") return ["main.ts", "api.ts"];
      return [];
    },
    getHealth: () => ({ connected: true, error: null, cacheEntries: 0 })
  };

  test("Detección de Intención: Prompts de Lenguaje Natural Complejos", async () => {
    const complexPrompts = [
      { role: "user", content: "Oye, ¿puedes refactorizar el código en 'src/auth.ts'?" },
      { role: "user", content: "Haz que 'utils.ts' sea más rápido optimizando los bucles." },
      { role: "user", content: "Hay un bug en 'core/logic.ts', corrígelo por favor." }
    ];

    for (const msg of complexPrompts) {
      const event = { type: "context" as const, messages: [msg] };
      const result = await handleContext(event, mockCtx, mockProvider);
      
      // Debe haber detectado la intención y retornado un mensaje de sistema con el advisory
      expect(result).toBeDefined();
      expect(result?.messages[0].role).toBe("system");
      expect(result?.messages[0].content).toContain("SEMANTIC_ADVISORY");
    }
  });

  test("Gatekeeper de Impacto: Bloqueo de Breaking Changes Silencioso", async () => {
    // Simular una llamada a herramienta de edición en un archivo crítico
    const event = {
      type: "tool_call" as const,
      toolCallId: "123",
      toolName: "replace_content",
      input: { relative_path: "broken.ts", needle: "BreakingChange", repl: "FixedChange" }
    };

    const result = await handleToolCall(event, mockCtx, mockProvider);
    
    // Verificaciones Críticas
    expect(result).toBeDefined();
    expect(result?.block).toBe(false); // No bloqueamos (LEAN), pero inyectamos alerta
    expect(result?.modifiedMessages?.[0].content).toContain("DEEP_IMPACT_WARNING");
    expect(result?.modifiedMessages?.[0].content).toContain("BreakingChange");
    expect(result?.modifiedMessages?.[0].content).toContain("main.ts, api.ts");
    
    // El sistema debe haber notificado visualmente al usuario
    expect(mockUI.notify).toHaveBeenCalled();
  });

  test("Resiliencia: Manejo de Paths Inexistentes o Malformados", async () => {
    const garbagePrompt = { role: "user", content: "Cambia el archivo que no existe asdf.txt" };
    const event = { type: "context" as const, messages: [garbagePrompt] };
    
    // No debería explotar, debería fallar silenciosamente o no inyectar nada
    const result = await handleContext(event, mockCtx, mockProvider);
    expect(result).toBeUndefined();
  });
});
