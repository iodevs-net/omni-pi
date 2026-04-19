⌥ × 🔮

**oh-my-pi × Serena**

**Native Semantic Bridge**

_Especificación Técnica & Mapa de Implementación_

Versión 1.0 · Abril 2026

Documento de Arquitectura · Para uso del equipo de agentes

# **1\. Resumen Ejecutivo**

Este documento define la arquitectura, fundamentos y plan de implementación del proyecto Native Semantic Bridge - una integración nativa entre oh-my-pi y Serena MCP que convierte dos herramientas excelentes pero desconectadas en un sistema cohesivo y proactivo.

|     | **EL PROBLEMA EN UNA FRASE**<br><br>oh-my-pi hace ediciones precisas a nivel de línea (hashline). Serena entiende el código a nivel semántico (símbolos, dependencias, grafo de llamadas). Hoy trabajan en paralelo sin coordinarse. El LLM paga el costo de esa desconexión en tokens, errores, y ciclos de corrección. |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |

|     | **EL OBJETIVO EN UNA FRASE**<br><br>Que oh-my-pi consulte a Serena automáticamente antes de cada edición, sin que el LLM tenga que pedirlo, convirtiendo el contexto semántico en un ciudadano de primera clase del harness. |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

El resultado esperado es medible: reducción de ciclos de error en ediciones cross-file, mejora dramática en modelos mediocres (como demostró Can Bölük con hashline), y un harness que hace al LLM más inteligente por diseño, no por prompt.

# **2\. El Problema: La Brecha Semántica**

## **2.1 Cómo edita código un LLM hoy**

Cuando un agente como oh-my-pi recibe la instrucción 'refactoriza la función authenticateUser', el flujo actual es:

1\. LLM recibe instrucción

2\. Lee auth.ts completo → ~2,000 tokens consumidos

3\. Propone edición con hashline → precisa, sin ambigüedad

4\. oh-my-pi aplica la edición → exitoso

5\. \[NADIE SABE\] que api/routes.ts importa authenticateUser

6\. \[NADIE SABE\] que middleware/verify.ts depende del tipo de retorno

7\. Tests fallan → LLM lee más archivos, gasta más tokens, corrige

8\. Ciclo se repite 2-4 veces → costo real: 8,000-20,000 tokens extra

## **2.2 Lo que Serena sabe pero nadie le pregunta**

Serena, corriendo como MCP externo, tiene disponible en todo momento:

- El grafo completo de quién llama a quién en el proyecto
- Todos los símbolos que dependen de authenticateUser
- Los tipos de retorno que otros módulos esperan
- Las implementaciones de interfaces relacionadas

Pero Serena solo responde cuando el LLM la invoca explícitamente. Y los LLMs - incluso los buenos - frecuentemente olvidan hacerlo, especialmente en sesiones largas donde el contexto de las instrucciones originales se ha diluido.

## **2.3 El costo real de la desconexión**

| **Componente**                   | **Estado Actual**                    | **Gap / Problema**                | **Impacto** |
| -------------------------------- | ------------------------------------ | --------------------------------- | ----------- |
| Edición simple (1 archivo)       | Hashline funciona bien               | Ninguno - problema resuelto       | Bajo        |
| Edición cross-file (3+ archivos) | LLM debe descubrir dependencias      | LLM no sabe qué buscar            | Alto        |
| Refactor de función pública      | LLM lee archivos ad-hoc              | Dependencias ocultas rompen build | Crítico     |
| Sesión larga (50+ turnos)        | Instrucciones iniciales pierden peso | Contexto semántico se pierde      | Alto        |
| Modelos mediocres (Flash, Mini)  | Alta tasa de error en patches        | Sin contexto semántico fallan más | Crítico     |

# **3\. Landscape Actual: Por Qué Nadie Lo Ha Resuelto**

## **3.1 Lo que ya existe**

- oh-my-pi: hashline edits, LSP post-edición, AST via tree-sitter, MCP support - mejor harness de edición existente
- Serena: comprensión semántica a nivel de símbolo, 30+ lenguajes, grafo de dependencias, memoria de proyecto
- Aider: repo-map estático - muestra estructura pero no actualiza dinámicamente ni se integra con el sistema de edición
- Cursor: indexación con embeddings - reactiva, el IDE busca contexto pero no lo valida contra ediciones pendientes

## **3.2 El gap que nadie ha cerrado**

Todas las soluciones existentes son reactivas: el LLM decide cuándo pedir contexto semántico. El Native Semantic Bridge propone invertir ese modelo: el harness provee el contexto automáticamente, antes de que el LLM lo necesite, validado contra la edición específica que está a punto de hacer.

|     | **DIFERENCIA FUNDAMENTAL**<br><br>Reactivo: el LLM llama a Serena cuando recuerda hacerlo. Proactivo: oh-my-pi consulta a Serena automáticamente antes de cada edición, y rechaza ediciones que romperían símbolos dependientes. |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

# **4\. Arquitectura de la Solución**

## **4.1 El Native Semantic Bridge**

Un módulo TypeScript que se integra como extensión nativa de oh-my-pi y opera en tres momentos del ciclo de edición:

FLUJO CON NATIVE SEMANTIC BRIDGE

Usuario: 'refactoriza authenticateUser'

│

▼

\[oh-my-pi\] Detecta edición pendiente sobre auth.ts::authenticateUser

│

▼ (NUEVO - automático, transparente al LLM)

\[bridge\] Consulta a Serena: find_referencing_symbols('authenticateUser')

│

▼

\[Serena\] Devuelve: {

dependents: \['api/routes.ts:45', 'middleware/verify.ts:12'\],

returnType: 'Promise&lt;AuthResult&gt;',

callers: 3,

breakingChange: true

}

│

▼ (NUEVO - inyección automática, comprimida)

\[bridge\] Agrega al contexto del LLM:

'⚠ 2 dependientes de esta función: routes.ts:45, verify.ts:12'

' Tipo de retorno esperado: Promise&lt;AuthResult&gt;'

│

▼

\[LLM\] Genera edición con contexto completo → 0 sorpresas

│

▼ (NUEVO - validación pre-commit)

\[bridge\] Valida con LSP que el nuevo código satisface los dependientes

│ ✓ OK → aplica con hashline

│ ✗ Error → rechaza, explica al LLM específicamente qué falló

▼

\[oh-my-pi\] Edición aplicada → 0 ciclos de corrección

## **4.2 Tres capas del bridge**

### **Capa 1: Pre-Edit Context Injection**

Antes de que el LLM genere su propuesta de edición, el bridge consulta a Serena y agrega al contexto un resumen comprimido de impacto semántico. El formato está diseñado para consumir el mínimo de tokens posible:

// Formato de inyección (diseñado para ser denso y claro al LLM)

SEMANTIC_CONTEXT {

target: auth.ts::authenticateUser

dependents: \[routes.ts:45, verify.ts:12, tests/auth.test.ts:88\]

returnType: Promise&lt;AuthResult&gt;

interface: IAuthService.authenticate (must match)

breakingChange: YES - 3 callers depend on return shape

}

### **Capa 2: Pre-Commit Semantic Validation**

Después de que el LLM genera la edición pero antes de aplicarla, el bridge verifica que los tipos y firmas de los símbolos dependientes siguen siendo satisfechos. Si no, rechaza la edición con un mensaje específico que el LLM puede usar directamente para corregir:

// Mensaje de rechazo (diseñado para ser accionable por el LLM)

EDIT_REJECTED {

reason: 'Return type mismatch',

expected: 'Promise&lt;AuthResult&gt;',

got: 'Promise&lt;void&gt;',

affected: 'routes.ts:45 - const result = await authenticateUser(...)',

suggestion: 'Mantén el tipo de retorno o actualiza los 3 callers'

}

### **Capa 3: Session Semantic Index**

Al inicio de cada sesión en un proyecto conocido, el bridge inyecta un resumen semántico del proyecto comprimido en pocos cientos de tokens. Esto elimina el costo de exploración aleatoria que paga el LLM al onboardear un proyecto:

// Índice semántico de sesión (generado por Serena, comprimido por bridge)

PROJECT_MAP {

entryPoints: \[src/index.ts, api/server.ts\],

coreModules: {

auth: \[authenticateUser, validateToken, refreshSession\],

db: \[UserModel, SessionModel\],

api: \[router, middleware/auth, middleware/rate-limit\]

},

conventions: \['imports: paths relativos', 'async: always await', 'errors: throw AuthError'\],

hotFiles: \[auth.ts, db/users.ts\] // editados en últimas 5 sesiones

}

# **5\. Fundamentos Técnicos**

## **5.1 Por qué oh-my-pi es el harness correcto**

- Ya tiene soporte nativo de MCP en ~/.omp/agent/mcp.json
- Ya tiene sistema de extensiones en packages/coding-agent/src/extensibility/
- Ya tiene hooks de lifecycle que se disparan en el ciclo de edición
- El addon Rust ya hace parsing de archivos - podría extenderse para el grafo
- El autor (Can Bölük) está activo y receptivo a PRs de calidad

## **5.2 Por qué Serena es el backend semántico correcto**

- MIT License - libre para fork y modificación
- 17,100 estrellas, mantenimiento activo
- SolidLSP backend: arranca language servers automáticamente, sin configuración
- Soporta 30+ lenguajes con la misma API
- API MCP limpia y bien documentada - ideal para consumir desde un bridge

## **5.3 Stack tecnológico del bridge**

packages/

coding-agent/

src/

extensibility/

serena-bridge/ ← NUEVO MÓDULO

index.ts ← Entry point de la extensión

pre-edit-context.ts ← Capa 1: context injection

pre-commit-validator.ts ← Capa 2: semantic validation

session-index.ts ← Capa 3: session semantic map

serena-client.ts ← Cliente MCP para Serena

compressor.ts ← Comprime respuestas de Serena a tokens mínimos

types.ts

tools/

edit.ts ← MODIFICAR: agregar hooks del bridge

session/

index.ts ← MODIFICAR: agregar session index al inicio

## **5.4 Requisitos del sistema**

- Node.js 18+ / Bun (ya requerido por oh-my-pi)
- Python + uv (para Serena MCP server - instrucciones de setup incluidas)
- 4 GB RAM mínimo (Serena + language servers son livianos)
- Conexión a internet para el LLM (el bridge corre 100% local)

# **6\. Plan de Implementación**

El plan está dividido en 6 fases secuenciales. Cada fase tiene criterios de éxito verificables antes de avanzar a la siguiente.

| **Fase** | **Objetivo**        | **Entregable**                                              | **Criterio de Éxito**                                                 |
| -------- | ------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| Fase 0   | Auditoría y setup   | Mapa de hooks internos de oh-my-pi + entorno de dev         | oh-my-pi compila con tests en verde + Serena conectado via MCP manual |
| Fase 1   | Bridge Adapter      | Módulo pi-serena-bridge en TypeScript                       | Consulta a Serena se dispara automáticamente antes de cada edición    |
| Fase 2   | Pre-edit validation | Hook de validación semántica pre-commit                     | Ediciones con símbolos rotos son rechazadas antes de aplicarse        |
| Fase 3   | Context injection   | Inyección de grafo semántico comprimido al inicio de sesión | Reducción medible de tokens de exploración en proyectos conocidos     |
| Fase 4   | Benchmarks          | Suite de 16 modelos x 100 tareas con y sin bridge           | Mejora estadísticamente significativa en modelos mediocres            |
| Fase 5   | PR upstream         | Pull Request a can1357/oh-my-pi                             | Merge o feedback oficial del autor                                    |

## **6.1 Fase 0 - Auditoría (2-3 días)**

Antes de escribir una línea de código, el equipo debe entender exactamente dónde y cómo oh-my-pi ejecuta ediciones. El objetivo es encontrar el hook correcto.

- Clonar oh-my-pi: gh repo fork can1357/oh-my-pi --clone
- Instalar y compilar: bun install && bun run build
- Localizar el ciclo de edición: buscar en packages/coding-agent/src/tools/edit.ts
- Mapear los hooks de extensión disponibles en src/extensibility/
- Verificar que Serena responde como MCP manual antes de automatizar

## **6.2 Fase 1 - Bridge Adapter (1 semana)**

Crear el módulo serena-bridge como extensión de oh-my-pi. En esta fase solo se intercepta el ciclo de edición y se llama a Serena - sin inyectar contexto aún.

- Crear packages/coding-agent/src/extensibility/serena-bridge/
- Implementar serena-client.ts: wrapper del MCP client de oh-my-pi para Serena
- Hookear el ciclo de edición en edit.ts para llamar al bridge
- Criterio de éxito: log visible de que Serena fue consultada antes de cada edición

## **6.3 Fase 2 - Pre-edit validation (1 semana)**

Implementar el rechazo de ediciones que rompen símbolos dependientes. Esta es la capa de mayor impacto inmediato.

- Implementar pre-commit-validator.ts
- Diseñar el formato de mensaje de rechazo (accionable por el LLM)
- Testear con ediciones que rompen tipos intencionalmente
- Criterio: edición que cambia tipo de retorno es rechazada con mensaje útil

## **6.4 Fase 3 - Context injection (1 semana)**

Inyectar el contexto semántico comprimido antes de que el LLM genere la edición. Aquí el expertise en meta-prompt engineering es crítico: el formato del contexto inyectado determina cuánto ayuda vs. cuánto confunde al LLM.

- Implementar pre-edit-context.ts y compressor.ts
- Diseñar el formato de inyección para cada tipo de LLM
- A/B test: edición con y sin contexto inyectado
- Criterio: reducción medible de tokens gastados en exploración

## **6.5 Fase 4 - Session Index (1 semana)**

Al inicio de sesión, inyectar el mapa semántico del proyecto. Más complejo que las fases anteriores porque requiere persistencia entre sesiones.

- Implementar session-index.ts con storage en .omp/serena-index.json
- Implementar actualización incremental del índice (no regenerar completo cada vez)
- Criterio: segunda sesión en mismo proyecto usa 60% menos tokens de exploración

# **7\. Cómo Medir el Éxito**

## **7.1 Benchmark principal: ediciones cross-file**

Diseñado siguiendo la metodología de Can Bölük para hashline: mismo modelo, misma tarea, con y sin bridge.

Metodología:

\- 16 modelos (incluyendo mediocres: Gemini Flash, GPT-4o Mini, DeepSeek V3)

\- 100 tareas de refactoring cross-file en 4 proyectos reales

\- 3 runs por combinación

\- Métrica primaria: tasa de éxito (build verde + tests verdes)

\- Métrica secundaria: tokens consumidos por tarea

\- Métrica terciaria: ciclos de corrección por tarea

Hipótesis:

\- Modelos mediocres: +30-50% tasa de éxito

\- Modelos buenos: +10-20% tasa de éxito + 40% menos tokens

\- Todos los modelos: -60% ciclos de corrección en ediciones cross-file

## **7.2 Métricas de calidad del bridge**

- Latencia del bridge: consulta a Serena debe completar en < 200ms para no degradar la UX
- Token overhead de inyección: el contexto semántico inyectado no debe superar 500 tokens por edición
- False positive rate de validación: rechazos incorrectos < 2%
- Coverage semántico: al menos 80% de las ediciones cross-file deberían recibir contexto relevante

# **8\. Instrucciones para el Equipo de Agentes**

## **8.1 Reglas de operación**

|     | **REGLA #1 - VERIFICAR ANTES DE ASUMIR**<br><br>Antes de implementar cualquier hook o punto de integración, leer el código fuente actual de oh-my-pi para verificar que el hook existe y funciona como se asume en este documento. El código es la verdad, este documento es el mapa. |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

|     | **REGLA #2 - TESTS PRIMERO**<br><br>Cada capa del bridge debe tener tests unitarios antes de ser integrada. Un bridge que introduce bugs en oh-my-pi es peor que no tener bridge. |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

|     | **REGLA #3 - MÍNIMA INVASIÓN**<br><br>El bridge debe ser una extensión, no una modificación de oh-my-pi. Si requiere cambiar más de 50 líneas en archivos existentes, la arquitectura está mal. Los hooks de extensión de oh-my-pi deben ser suficientes. |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

|     | **REGLA #4 - EL COMPRESSOR ES CRÍTICO**<br><br>Serena devuelve respuestas detalladas. El compressor.ts debe reducirlas a < 500 tokens sin perder la información accionable. Esta es la pieza más difícil y la que más requiere iteración. Testear con LLMs reales, no asumir que el formato funciona. |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

## **8.2 Archivos clave a estudiar primero**

oh-my-pi (estudiar en este orden):

1\. packages/coding-agent/src/tools/edit.ts

→ Aquí vive el ciclo de edición. Encontrar el punto de hook.

2\. packages/coding-agent/src/extensibility/

→ API de extensiones. Entender qué eventos expone.

3\. packages/coding-agent/src/session/index.ts

→ Inicio de sesión. Aquí va el session index.

4\. packages/coding-agent/src/mcp/

→ Cliente MCP existente. El bridge lo reutiliza para hablar con Serena.

Serena (estudiar en paralelo):

1\. src/serena/tools/ → Qué tools expone via MCP

2\. find_referencing_symbols, find_symbol, get_symbols_in_file → Las 3 más importantes

3\. Formato exacto de las respuestas → Input del compressor

## **8.3 Señales de alarma**

- Si Serena tarda > 500ms en responder: revisar si el language server está indexado. Primera consulta siempre es lenta, las siguientes deben ser < 100ms.
- Si el LLM ignora el contexto inyectado: el formato del compressor necesita iteración. Experimentar con diferentes estructuras hasta que el LLM lo consuma naturalmente.
- Si el bridge rechaza ediciones válidas (false positives > 2%): el validador es demasiado estricto. Agregar whitelist de patrones conocidos.
- Si oh-my-pi se vuelve lento: el bridge está en el hot path. Mover consultas a Serena a background con pre-fetch predictivo.

# **9\. Roadmap Post-V1**

Una vez que el bridge esté funcionando y benchmarkeado, hay extensiones naturales:

## **Multi-agente semántico**

Cuando oh-my-pi lanza subagentes paralelos (Agent Teams), el bridge debería coordinar el acceso al grafo semántico para evitar que dos agentes editen el mismo símbolo simultáneamente con información desactualizada.

## **Memoria episódica de errores semánticos**

Registrar en .omp/serena-memory.jsonl los patrones de error semántico específicos de cada proyecto. Inyectarlos como contexto adicional en sesiones futuras: 'en este repo, cambiar el tipo de retorno de funciones auth siempre rompe el middleware'.

## **PR upstream a oh-my-pi**

El objetivo final es que Can Bölük incorpore el bridge como parte oficial de oh-my-pi, con Serena como MCP de primera clase en lugar de una configuración manual. Para lograrlo, el benchmark debe ser irrefutable y el código debe seguir exactamente los patrones del proyecto.

# **10\. Referencias y Recursos**

## **Repositorios**

- oh-my-pi: <https://github.com/can1357/oh-my-pi>
- Serena MCP: <https://github.com/oraios/serena>
- tree-sitter: <https://github.com/tree-sitter/tree-sitter>
- Bun runtime: <https://bun.sh>

## **Documentación clave**

- oh-my-pi extensibility API: /docs/sdk.md en el repo
- Serena MCP tools reference: /docs/ en el repo de Serena
- LSP specification: <https://microsoft.github.io/language-server-protocol/>
- Model Context Protocol: <https://modelcontextprotocol.io/>

## **Inspiración técnica**

- Hashline benchmark original de Can Bölük: README.md de oh-my-pi, sección 'Benchmarks'
- Serena's agent-first tool design: README.md de Serena, sección 'Tool Design'
- Aider repo-map (referencia de lo que NO queremos hacer - estático): <https://aider.chat/docs/repomap.html>

_Native Semantic Bridge - oh-my-pi × Serena · v1.0 · Abril 2026_

**_Este documento es el mapa. El código es la verdad._**
