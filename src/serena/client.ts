import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ISemanticProvider, CallToolResult } from "../types.js";

/**
 * Layer A: Serena Adapter (Resilient Version)
 * Handles MCP connection, semantic caching, and circuit-breaker logic.
 */
export class SerenaClient implements ISemanticProvider {
  private client: Client;
  private transport: StdioClientTransport;
  private isConnected: boolean = false;
  private connectionError: string | null = null;
  
  // Semantic Cache to avoid redundant calls
  private cache: Map<string, { data: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 10000; 
  
  private readonly DEFAULT_TIMEOUT = 3000;

  constructor() {
    // Audit Fix #2 (Re-corregido): El ejecutable es 'serena' y el comando es 'start-mcp-server'.
    this.transport = new StdioClientTransport({
      command: "uvx",
      args: [
        "--from",
        "git+https://github.com/oraios/serena",
        "serena",
        "start-mcp-server"
      ],
    });

    this.client = new Client(
      { 
        name: "pi-serena-bridge", 
        version: "1.3.0",
        description: "Native Semantic Bridge for oh-my-pi",
      },
      { capabilities: {} }
    );
  }

  public async connect(): Promise<boolean> {
    if (this.isConnected) return true;
    
    try {
      await this.client.connect(this.transport);
      this.isConnected = true;
      this.connectionError = null;
      return true;
    } catch (error) {
      this.isConnected = false;
      this.connectionError = (error as Error).message;
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.transport.close();
        this.isConnected = false;
      }
    } catch (error) {
      console.warn("[Serena] Error durante la desconexión:", error);
    }
  }

  public async getSymbolsOverview(path: string, timeoutMs = this.DEFAULT_TIMEOUT): Promise<string> {
    if (!this.isConnected) {
      const ok = await this.connect();
      if (!ok) return "[Bridge] Serena no disponible.";
    }

    const cached = this.cache.get(path);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.data;
    }

    try {
      const response = await this.client.callTool(
        {
          name: "get_symbols_overview",
          arguments: { relative_path: path, depth: 1 },
        }
      ) as CallToolResult;

      const result = (response.content?.[0] as any)?.text || "";
      this.cache.set(path, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      return `[Error Semántico] ${error instanceof Error ? error.message : "Desconocido"}`;
    }
  }

  public async getIncomingReferences(symbolName: string, path: string): Promise<string[]> {
    if (!this.isConnected) return [];

    try {
      const response = await this.client.callTool({
        name: "find_referencing_symbols",
        arguments: {
          symbol: symbolName,
          path: path
        }
      }) as CallToolResult;

      if (!response || !response.content) return [];

      const refs = (response.content as any[])
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n");

      const files = [...new Set(refs.match(/[a-zA-Z0-9._/-]+\.(ts|js|py|go|rs)/g) || [])] as string[];
      return files.filter(f => f !== path && !f.endsWith(`/${path.split("/").pop()}`));
      
    } catch (e) {
      return [];
    }
  }

  public getHealth() {
    return {
      connected: this.isConnected,
      error: this.connectionError,
      cacheEntries: this.cache.size
    };
  }
}
