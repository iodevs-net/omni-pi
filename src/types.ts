/**
 * MASTER-SPEC-PROTOCOL: Layer C - Hook Interceptors Types
 * Contrato de tipos para oh-my-pi bridge.
 */

export interface ExtensionContext {
  ui: any;
  cwd: string;
  getContextUsage(): any;
  hasUI: boolean;
  isIdle(): boolean;
  getSystemPrompt(): string;
}

export interface SessionStartEvent {
  type: "session_start";
}

export interface ContextEvent {
  type: "context";
  messages: any[];
}

export interface ToolCallEvent {
  type: "tool_call";
  toolCallId: string;
  toolName: string;
  input: Record<string, any>;
}

/**
 * Respuesta de validación para hooks que pueden bloquear o modificar.
 */
export interface HookResponse {
  block?: boolean;
  message?: string;
  modifiedMessages?: any[];
}

/**
 * Interface agnóstica para proveedores de análisis semántico.
 * Permite cambiar Serena por LSP u otras herramientas en el futuro.
 */
export interface ISemanticProvider {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  getSymbolsOverview(path: string, timeoutMs?: number): Promise<string>;
  getIncomingReferences(symbolName: string, path: string): Promise<string[]>;
  getHealth(): { connected: boolean; error: string | null; cacheEntries: number };
}
