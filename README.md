# Omni-Pi (v5.0.0)
### Universal Semantic Intelligence Bridge for oh-my-pi

**Omni-Pi** es la capa de inteligencia semántica proactiva diseñada para **oh-my-pi** (la CLI de orquestación para agentes de IA). Actúa como un puente de alta velocidad entre el motor de análisis estático **Serena MCP** y el ciclo de vida de la sesión del agente, eliminando el "Semantic Gap" y garantizando que el modelo trabaje con una conciencia total de la arquitectura del proyecto.

---

## 📖 ¿Qué es oh-my-pi?
`oh-my-pi` (omp) es un harness de ejecución para LLMs que permite a los agentes interactuar con el sistema de archivos y ejecutar herramientas. Aunque es extremadamente potente, los LLMs suelen sufrir de **ceguera arquitectónica**: no conocen las dependencias de un símbolo hasta que intentan editarlo o leerlo manualmente, lo que genera alucinaciones o "breaking changes" accidentales.

## 🛡️ ¿Qué es Omni-Pi?
Omni-Pi resuelve esta ceguera. Es un plugin que intercepta cada mensaje del usuario y cada llamada a herramientas para inyectar, de forma transparente y eficiente en tokens, un **mapa semántico del proyecto**. 

### Problema que resuelve: El Semantic Gap
Sin Omni-Pi, un modelo como Nemotron o GPT-4o debe gastar tokens y turnos explorando archivos para entender una interfaz. **Omni-Pi elimina este desperdicio** inyectando el contexto necesario *antes* de que el modelo lo pida, validando además que ninguna edición rompa el grafo de dependencias externo.

---

## 🚀 Arquitectura Técnica (Elite v5.0)

### 1. Semantic Compression (3-Layer Hierarchy)
Para no saturar la ventana de contexto, Omni-Pi utiliza un algoritmo de compresión jerárquica:
- **E> (Exported)**: APIs y contratos públicos. Prioridad máxima.
- **S> (Structural)**: Clases, interfaces y tipos que definen la forma del código.
- **I> (Implementation)**: Lógica interna del archivo (inyectada solo si sobra espacio).
- **Token Density**: Eliminación de modificadores redundantes (como `public` en TS) y compactación sintáctica para ganar un **~30% de densidad informativa**.

### 2. Deep Impact Analysis (Parallel Gatekeeper)
Antes de aplicar un parche (`replace_content`, `edit_file`), Omni-Pi dispara consultas en paralelo al grafo de Serena para identificar referencias cruzadas. Si una edición en `types.ts` afecta a `auth.ts`, el agente recibe un **Impact Warning** inmediato, evitando roturas de tipos silenciosas.

### 3. Intent Detection (Natural Language Stemming)
No requiere comandos especiales. El puente detecta intenciones semánticas (`refactor`, `fix`, `optimiza`, `bug`) en el lenguaje natural del usuario y prepara el contexto del archivo mencionado automáticamente.

---

## 🛠️ Instalación y Setup

### Requisitos
- **Bun** (Runtime oficial).
- **Serena MCP** instalado y configurado globalmente.
- **oh-my-pi** (v14.1.2 o superior).

### Instalación
Clona este repositorio en el directorio de extensiones de tu proyecto o añádelo a tu configuración de `omp`:
```bash
git clone https://github.com/iodevs-net/omni-pi.git omp/extensions/omni-pi
```

### Variables de Entorno
- `OMNI_PI_MAX_COMPRESS_CHARS`: Límite de caracteres para el advisory (default: 2500).

---

## 🧪 Validación y Calidad
Este proyecto sigue los estándares **DRY+SOLID+LEAN+KISS**. La suite de tests incluye stress-tests de 10k símbolos y validación de integración de hooks:
```bash
bun test
```
Para una verificación real en terminal:
```bash
bun run verify-omp.ts
```

## 💡 Recomendaciones Senior
1. **Uso de Modelos Free**: Omni-Pi eleva la capacidad de modelos como Nemotron o Llama 3 al nivel de modelos Frontier al proporcionarles el conocimiento arquitectónico del que carecen.
2. **Contexto Limpio**: Si Omni-Pi inyecta un advisory, confía en él. Está basado en análisis estático real (LSP), no en predicciones probabilísticas.
3. **Mantenimiento**: Mantén `Serena` actualizado para soportar las últimas versiones de tu lenguaje de programación preferido.

---
*Omni-Pi - Bridging the Semantic Gap · v5.0.0 · Abril 2026*
