import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ISemanticProvider } from "../types.js";

/**
 * Layer A: Serena Adapter (Resilient Version)
 * Handles MCP connection, semantic caching, and circuit-breaker logic.
 */
export class SerenaClient implements ISemanticProvider {
  private client: Client;
  private transport: StdioClientTransport;
  private isConnected: boolean = false;
  private connectionError: string | null = null;
  
  // Semantic Cache to avoid redundant calls (Audit Item 1.2)
  private cache: Map<string, { data: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 10000; // 10 seconds TTL
  private readonly DEFAULT_TIMEOUT = 10000;

  constructor() {
    this.transport = new StdioClientTransport({
      command: "uvx",
      args: ["serena-mcp", "server"],
    });

    this.client = new Client(
      { 
        name: "pi-serena-bridge", 
        version: "1.2.0",
        // Metadata extendida para estándares 2026
        description: "Native Semantic Bridge for oh-my-pi",
      },
      { capabilities: {} }
    );
  }

  /**
   * Established connection with Serena MCP server.
   */
  public async connect(): Promise<boolean> {
    if (this.isConnected) return true;
    
    try {
      await this.client.connect(this.transport);
      this.isConnected = true;
      this.connectionError = null;
      console.log("[Serena] Conexión establecida con éxito.");
      return true;
    } catch (error) {
      this.isConnected = false;
      this.connectionError = (error as Error).message;
      console.error("[Serena] Error crítico de conexión:", error);
      return false;
    }
  }

  /**
   * Safely disconnect from the server.
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.transport.close();
        this.isConnected = false;
        console.log("[Serena] Desconexión limpia completada.");
      }
    } catch (error) {
      console.warn("[Serena] Error durante la desconexión:", error);
    }
  }

  /**
   * Retrieves an overview of symbols with caching and flexible timeouts.
   * (Addressing Audit Item 1.2 & 1.3)
   */
  public async getSymbolsOverview(path: string, timeoutMs = this.DEFAULT_TIMEOUT): Promise<string> {
    if (!this.isConnected) {
      const ok = await this.connect();
      if (!ok) return "[Bridge] Serena no disponible. Omitiendo análisis semántico.";
    }

    // Cache hit?
    const cached = this.cache.get(path);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.data;
    }

    try {
      const response = await this.client.callTool(
        {
          name: "get_symbols_overview",
          arguments: { relative_path: path, depth: 1 },
        },
        { timeout: timeoutMs }
      );

      const result = (response.content[0] as any).text || "";
      
      // Store in cache
      this.cache.set(path, { data: result, timestamp: Date.now() });
      
      return result;
    } catch (error) {
      console.error(`[Serena] Error en getSymbolsOverview (${path}):`, error);
      return `[Error Semántico] ${error instanceof Error ? error.message : "Desconocido"}`;
    }
  }

  /**
   * Identifica qué otros archivos consumen símbolos de este archivo.
   * Proporciona trazabilidad de impacto profundo (Deep Impact Analysis).
   */
  public async getIncomingReferences(symbolName: string, path: string): Promise<string[]> {
    if (!this.isConnected) return [];

    try {
      const response = await this.client.callTool({
        name: "find_referencing_symbols",
        arguments: {
          symbol: symbolName,
          path: path
        }
      });

      if (!response || !response.content) return [];

      const refs = (response.content as any[])
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n");

      // Extraer nombres de archivos únicos usando una regex simple pero efectiva
      const files = [...new Set(refs.match(/[a-zA-Z0-9._/-]+\.(ts|js|py|go|rs)/g) || [])] as string[];
      
      // Filtrar el archivo origen para mostrar solo el impacto externo
      const currentFile = path.split("/").pop() || path;
      return files.filter(f => !f.includes(currentFile));
      
    } catch (e) {
      console.warn(`[Serena] Error buscando referencias para ${symbolName}:`, e);
      return [];
    }
  }

  /**
   * Returns current health status.
   */
  public getHealth() {
    return {
      connected: this.isConnected,
      error: this.connectionError,
      cacheEntries: this.cache.size
    };
  }
}
