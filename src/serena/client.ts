import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

export class SerenaClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  constructor(private projectPath: string) {}

  async connect() {
    const transport = new StdioClientTransport({
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

    await this.client.connect(transport);
    this.transport = transport;
    console.log("Connected to Serena MCP");
  }

  async findReferencingSymbols(namePath: string, relativePath: string) {
    if (!this.client) throw new Error("Client not connected");
    
    return await this.client.callTool({
      name: "find_referencing_symbols",
      arguments: {
        name_path: namePath,
        relative_path: relativePath,
      },
    });
  }

  async getSymbolsOverview(relativePath: string) {
    if (!this.client) throw new Error("Client not connected");

    return await this.client.callTool({
      name: "get_symbols_overview",
      arguments: {
        relative_path: relativePath,
      },
    });
  }

  async disconnect() {
    if (this.transport) {
      await this.transport.close();
    }
    this.client = null;
    this.transport = null;
  }
}
