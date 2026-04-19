import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * Layer A: Adaptador Serena (Client)
 * Gestiona la conexión MCP asíncrona con timeouts estrictos.
 */
export class SerenaClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private readonly TIMEOUT_MS = 10000; // Regla de Oro 3: 10s timeout

  constructor(private projectPath: string) {}

  /**
   * Inicializa la conexión con el servidor Serena MCP.
   */
  async connect(): Promise<void> {
    try {
      this.transport = new StdioClientTransport({
        command: "uvx",
        args: [
          "--from",
          "git+https://github.com/oraios/serena",
          "serena",
          "start-mcp-server",
          "--context",
          "agent",
          "--project",
          this.projectPath,
        ],
      });

      this.client = new Client(
        {
          name: "pi-serena-bridge",
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );

      await this.client.connect(this.transport);
      console.log("[Serena] Conexión establecida.");
    } catch (error) {
      console.error("[Serena] Error de conexión:", error);
      throw new Error("No se pudo conectar con el servidor Serena MCP.");
    }
  }

  /**
   * Ejecuta una herramienta de Serena con protección de timeout.
   */
  private async callToolWithTimeout(name: string, args: any): Promise<any> {
    if (!this.client) throw new Error("Cliente Serena no conectado.");

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout de ${this.TIMEOUT_MS}ms superado para la herramienta ${name}`)), this.TIMEOUT_MS)
    );

    try {
      return await Promise.race([
        this.client.callTool({ name, arguments: args }),
        timeoutPromise,
      ]);
    } catch (error) {
      console.error(`[Serena] Error en herramienta ${name}:`, error);
      throw error;
    }
  }

  async findReferencingSymbols(namePath: string, relativePath: string) {
    return await this.callToolWithTimeout("find_referencing_symbols", {
      name_path: namePath,
      relative_path: relativePath,
    });
  }

  async getSymbolsOverview(relativePath: string) {
    return await this.callToolWithTimeout("get_symbols_overview", {
      relative_path: relativePath,
    });
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
    }
    this.client = null;
    this.transport = null;
  }
}
