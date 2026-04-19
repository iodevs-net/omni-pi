/**
 * Layer B: Semantic Compressor (Elite Version)
 * Procesa y comprime la data de Serena para maximizar el valor por token.
 * (Addressing OMP Audit Suggestion - Smart Prioritization)
 */
export class SemanticCompressor {
  private static readonly MAX_CHARS = 2500; // ~500-600 tokens

  public static compress(rawSymbols: string): string {
    if (!rawSymbols) return "No symbols detected.";

    // 1. Limpieza de ruido (Comentarios y líneas vacías)
    const lines = rawSymbols.split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith("//") && !line.startsWith("/*") && !line.startsWith("*"));

    // 2. Clasificación por Relevancia Estructural
    const structuralLines: string[] = [];
    const implementationLines: string[] = [];

    for (const line of lines) {
      const isStructural = /export|class|interface|enum|type|public|private|protected|abstract|extends|implements/.test(line);
      if (isStructural) {
        structuralLines.push(line);
      } else {
        implementationLines.push(line);
      }
    }

    // 3. Ensamblaje con Prioridad
    let result = "--- Project Structure ---\n";
    let currentCharCount = result.length;
    let addedCount = 0;

    // Añadir líneas estructurales primero
    for (const line of structuralLines) {
      if (currentCharCount + line.length > this.MAX_CHARS) break;
      result += `- ${line}\n`;
      currentCharCount += line.length + 3;
      addedCount++;
    }

    // Añadir líneas de implementación si queda espacio
    if (currentCharCount < this.MAX_CHARS && implementationLines.length > 0) {
      result += "\n--- Implementation Details ---\n";
      currentCharCount += 28;
      for (const line of implementationLines) {
        if (currentCharCount + line.length > this.MAX_CHARS) break;
        result += `- ${line}\n`;
        currentCharCount += line.length + 3;
        addedCount++;
      }
    }

    // 4. Indicador de Truncamiento REAL
    if (addedCount < lines.length) {
      result += "\n[Note: Some minor details were omitted for brevity]";
    }

    return result;
  }
}
