pi-serena-bridge/
├── src/
│ ├── index.ts ← HookFactory export default
│ ├── hooks/
│ │ ├── tool-call.ts ← Capa 2: bloquea ediciones rotas
│ │ ├── context.ts ← Capa 1: inyecta contexto semántico
│ │ └── session-start.ts ← Capa 3: inicializa índice
│ ├── serena/
│ │ ├── client.ts ← Llama a Serena MCP programáticamente
│ │ └── resolver.ts ← path+línea → símbolo via Serena
│ ├── compressor.ts ← Respuesta Serena → <500 tokens
│ └── storage.ts ← Lee/escribe .omp/serena-index.json
├── package.json
├── tsconfig.json
├── README.md
└── .omp/ ← Config de ejemplo para el usuario
└── agent/
└── mcp.json.example

El archivo más importante: src/index.ts
Este es el esqueleto real basado en la API que confirmó el agente:

```typescript
// src/index.ts — HookFactory requerido por oh-my-pi
import type { HookAPI } from "@oh-my-pi/pi-coding-agent";
import { handleToolCall } from "./hooks/tool-call.ts";
import { handleContext } from "./hooks/context.ts";
import { handleSessionStart } from "./hooks/session-start.ts";

export default function (api: HookAPI) {
  // Capa 3: al iniciar sesión, carga índice semántico
  api.on("session_start", handleSessionStart);

  // Capa 1: antes de cada llamada al LLM, inyecta contexto semántico
  api.on("context", handleContext);

  // Capa 2: intercepta tool "edit" antes de aplicar
  api.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "edit") return undefined;
    return handleToolCall(event, ctx);
  });
}
```
