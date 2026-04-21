/**
 * Layer B: Semantic Compressor (Elite Version)
 * Procesa y comprime la data de Serena para maximizar el valor por token.
 * (Addressing OMP Audit Suggestion - Smart Prioritization)
 */
export class SemanticCompressor {
  public static readonly MAX_CHARS = parseInt(process.env.OMNI_PI_MAX_COMPRESS_CHARS || '2500', 10);

  public static compress(rawSymbols: string, maxChars?: number): string {
    const limit = maxChars !== undefined ? Math.min(maxChars, this.MAX_CHARS) : this.MAX_CHARS;
    
    if (!rawSymbols) return "No symbols detected.";

    // 1. Limpieza de ruido y normalización agresiva
    const lines = rawSymbols.split('\n')
      .map(line => line.trim())
      .filter(line => 
        line.length > 0 && 
        !/^\s*(\/\/|\/\*|\*|\/{2,})/.test(line) &&
        !/^import\s+/.test(line)
      );

    if (lines.length === 0) return "No symbols detected.";

    const normalizedLines = lines.map(line => line
        // Eliminar modificadores redundantes (public es default en TS)
        .replace(/\bpublic\s+/g, '')
        // Simplificar espacios múltiples
        .replace(/\s{2,}/g, ' ')
        // Compactar flechas y llaves
        .replace(/\s*=>\s*/g, '=>')
        .replace(/\s*\{\s*$/g, '')
      );

    // 2. Clasificación Inteligente de 3 Capas
    const exportedLines: string[] = [];
    const structuralLines: string[] = [];
    const implementationLines: string[] = [];

    const structuralKeywords = /\b(class|interface|enum|type|function|async|const)\b/;

    for (const line of normalizedLines) {
      if (line.startsWith('export')) {
        exportedLines.push(line);
      } else if (structuralKeywords.test(line)) {
        structuralLines.push(line);
      } else {
        implementationLines.push(line);
      }
    }

    // 3. Ensamblaje con Densidad Máxima y Prioridad de Exportación
    let result = "--- SEMANTIC STRUCTURE ---\n";
    let currentCharCount = result.length;
    let addedCount = 0;

    const processBatch = (batch: string[], prefix: string) => {
      for (const line of batch) {
        const entry = `${prefix}${line}\n`;
        if (currentCharCount + entry.length > limit) return false;
        result += entry;
        currentCharCount += entry.length;
        addedCount++;
      }
      return true;
    };

    // Prioridad 1: Exportaciones (Crucial para API externa)
    if (!processBatch(exportedLines, "E> ")) {
      result += "[Truncated: High Complexity]\n";
    } else {
      // Prioridad 2: Estructura Interna (Ayuda a entender el archivo)
      if (structuralLines.length > 0 && currentCharCount < limit) {
        if (!processBatch(structuralLines, "S> ")) {
          result += "[Truncated: Internal Structure]\n";
        }
      }
      
      // Prioridad 3: Implementación (Solo si hay espacio de sobra)
      if (implementationLines.length > 0 && currentCharCount < limit) {
        result += "\n--- IMPLEMENTATION ---\n";
        currentCharCount += 22;
        processBatch(implementationLines, "I> ");
      }
    }

    // 4. Indicador de Truncamiento REAL
    if (addedCount < lines.length) {
      const omitted = lines.length - addedCount;
      result += `\n[Note: ${omitted} minor details were omitted for brevity]`;
    }

    return result;
  }
}