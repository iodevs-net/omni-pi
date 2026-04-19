# Pi-Serena Semantic Bridge 🚀

**Pi-Serena Bridge** is a native extension for [oh-my-pi](https://github.com/iodevs-net/oh-my-pi) that establishes a proactive semantic link with the [Serena MCP Server](https://github.com/iodevs-net/serena). 

It transforms your agent from a file-based editor into a **semantic-aware architect**, preventing breaking changes and optimizing context usage through real-time symbol analysis.

## 🧠 The Problem: The Semantic Gap
Standard coding agents are often "blind" to the global impact of their edits. They might modify a function in one file without knowing it's used in 20 others. This leads to broken dependencies, architectural erosion, and wasted tokens on manual searches.

## ✨ Features

- **🛡️ Semantic Guard (Gatekeeper)**: Intercepts `edit` tool calls. If Serena detects that the change affects external dependencies, the bridge warns the agent before the commit is made.
- **📡 Proactive Context Injection**: Automatically detects user intent (e.g., "refactor", "fix") and injects a compressed summary of relevant symbols into the LLM's system prompt.
- **⚡ Semantic Compressor**: Uses a custom algorithm to fit critical project architecture data into less than 500 tokens.
- **🔌 Native Integration**: Zero-latency hooks for `session_start`, `context`, and `tool_call`.

## 🏗️ Architecture

The bridge follows a strictly decoupled 3-layer architecture:

1. **Layer A: Serena Client**: Manages the MCP connection via Stdio with robust 10s timeouts.
2. **Layer B: Semantic Compressor**: Processes and truncates symbol data for token efficiency.
3. **Layer C: Hook Interceptors**: Implements `oh-my-pi` extensibility API to orchestrate the bridge behavior.

## 🚀 Installation

1. Clone this repository into your `oh-my-pi` extensions directory:
   ```bash
   mkdir -p ~/.omp/extensions
   git clone https://github.com/iodevs-net/pi-serena-bridge.git ~/.omp/extensions/pi-serena-bridge
   ```
2. Install dependencies:
   ```bash
   cd ~/.omp/extensions/pi-serena-bridge
   bun install
   ```
3. Restart `omp`. You should see the `✅ Semántica Activa` status in your terminal.

## 🛠️ Development

This project was built following the **DRY+KISS+LEAN+SOLID** principles.

- **Runtime**: [Bun](https://bun.sh)
- **Language**: TypeScript (Strict Mode)
- **Engine**: MCP SDK

---
Developed with ❤️ by the iodevs-net team.
