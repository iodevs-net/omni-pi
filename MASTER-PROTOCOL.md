# MASTER-SPEC-PROTOCOL: Pi-Serena Semantic Bridge

## 1. Visión y Objetivo
Eliminar el **Semantic Gap** en `oh-my-pi`. El bridge debe interceptar ediciones y proporcionar contexto de dependencias proactivamente para evitar "breaking changes" antes de que el LLM proponga el código.

### Core Principles
| Principio | Aplicación en el Bridge |
| :--- | :--- |
| **DRY** | Usar Serena para toda la lógica simbólica; no reimplementar parsing. |
| **KISS** | Un solo punto de entrada (`src/index.ts`) que orqueste hooks simples. |
| **SOLID** | Cada hook (`context`, `tool_call`) tiene una responsabilidad única. |
| **LEAN** | No inyectar contexto si no hay una intención clara de edición (YAGNI). |
| **Zero-Invasive** | No modificar el core de `oh-my-pi`; usar solo el sistema de extensiones. |

---

## 2. Arquitectura Técnica Atómica

### 2.1. Capas del Sistema
1.  **Layer A: Adaptador Serena (Client)**
    *   Gestiona la conexión MCP vía Stdio.
    *   Comando: `uvx --from git+https://github.com/oraios/serena serena start-mcp-server`.
    *   Contexto: `agent`.
2.  **Layer B: Semantic Compressor**
    *   Entrada: JSON de Serena.
    *   Salida: String comprimido `SEMANTIC_CONTEXT { ... }`.
    *   Límite: < 500 tokens por inyección.
3.  **Layer C: Hook Interceptors**
    *   `session_start`: Activa e indexa el proyecto en Serena.
    *   `context`: Inyecta avisos y símbolos antes de que el LLM genere una respuesta.
    *   `tool_call`: Valida los patches del comando `edit` contra el grafo de Serena.

---

## 3. Sistema de GATES (Workflow)

Cada tarea del plan debe pasar por este flujo:

*   **GATE 0: Aislar**: Crear rama o entorno de trabajo limpio.
*   **GATE 1: Investigar**: Validar tipos en `oh-my-pi` y herramientas en `Serena`. Certeza > 90%.
*   **GATE 2: Planificar**: Definir la tarea atómica en el `task.md`.
*   **GATE 3: Implementar**: Escribir el código mínimo necesario siguiendo SOLID.
*   **GATE 4: Validar**: Ejecutar `bun run build` y tests de conectividad.
*   **GATE 5: Limpiar**: Eliminar logs de debug y archivos temporales.

---

## 4. Mapa de Implementación (Plan de Trabajo)

### Fase 1: Cimentación (Infraestructura)
*   **[T1.1] Serena Client**: Implementar conexión robusta con manejo de procesos.
*   **[T1.2] Types Contract**: Definir interfaces para los eventos de `oh-my-pi`.
*   **[T1.3] Compressor Core**: Lógica de transformación de símbolos a tokens.

### Fase 2: El Bridge (Hooks)
*   **[T2.1] Session Trigger**: Indexación automática al arrancar.
*   **[T2.2] Dynamic Context**: Inyector inteligente basado en palabras clave (`refactor`, `change`, `fix`).
*   **[T2.3] Semantic Guard (Edit)**: Interceptor de `tool_call` que bloquea si Serena detecta roturas.

### Fase 3: Validación E2E
*   **[T3.1] Test de Integración**: Simular un refactor complejo y verificar bloqueo.
*   **[T3.2] Optimizador de Tokens**: Ajustar el compressor para máxima densidad.

---

## 5. Matriz de Validación y Tests Finales
| Test | Escenario | Criterio de Éxito |
| :--- | :--- | :--- |
| **Conectividad** | Inicio de sesión | Serena responde con `list_tools`. |
| **Inyección** | Usuario pide un cambio | El prompt del sistema incluye `SEMANTIC_CONTEXT`. |
| **Protección** | Edit rompe un tipo | El bridge retorna `block: true` y el error de Serena. |

---

## 6. Reglas de Ingeniería (AI Instructions)
1.  **Protección de Hardware**: Minimizar escrituras. Usar `scratch/` para pruebas temporales.
2.  **No Lore**: Prohibido el lenguaje florido. Solo hechos técnicos y código idiomático.
3.  **Sync-Safety**: Toda llamada a Serena debe tener un timeout de 10s máximo.
4.  **Error Handling**: Si Serena falla, el bridge debe fallar silenciosamente (no bloquear `oh-my-pi`) para mantener la operatividad.

---

**Estado del Protocolo: PENDIENTE DE APROBACIÓN POR EL USUARIO.**
