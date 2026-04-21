import { expect, test, describe } from "bun:test";
import { SemanticCompressor } from "../src/compressor.js";

describe("🔥 SemanticCompressor STRESS & EDGE-CASES", () => {
  
  test("Evasión de Presupuesto: Caso de Archivo Masivo (10k símbolos)", () => {
    // Generar un archivo masivo con mezcla de export, estructura e implementación
    const massiveRaw = Array.from({ length: 1000 }, (_, i) => [
      `export const Export${i} = ${i};`,
      `class InternalStructure${i} { }`,
      `function privateHelper${i}() { return ${i}; }`
    ]).flat().join('\n');

    const limit = 500; // Límite muy estricto
    const compressed = SemanticCompressor.compress(massiveRaw, limit);
    
    // Verificaciones Críticas
    expect(compressed.length).toBeLessThanOrEqual(limit + 100); // Margen de headers
    expect(compressed).toContain("E> export const Export0");
    // Al ser el límite tan bajo (500), las exportaciones deben haber devorado el espacio
    // No debería haber implementaciones (I>) si el presupuesto se agotó en E>
    if (compressed.includes("--- IMPLEMENTATION ---")) {
      const implPos = compressed.indexOf("--- IMPLEMENTATION ---");
      const exportPos = compressed.lastIndexOf("E> ");
      expect(exportPos).toBeLessThan(implPos);
    }
    expect(compressed).toContain("[Note:");
  });

  test("Caso de Borde: Símbolos con Nombres Conflictivos", () => {
    const conflictRaw = `
      export const class_name = "test"; // No es una clase
      function async_helper() {} // No es un modificador async sino parte del nombre
      export type { NamedType } from "./types"; // Exportación de tipo compleja
    `;
    const compressed = SemanticCompressor.compress(conflictRaw);
    
    expect(compressed).toContain("E> export const class_name");
    expect(compressed).toContain("S> function async_helper()");
    // Verificar que no hay falsos positivos por regex flojas
    expect(compressed).not.toMatch(/E>\s+class/); 
  });

  test("Integridad: Archivo Vacío o Solo Basura", () => {
    expect(SemanticCompressor.compress("")).toBe("No symbols detected.");
    expect(SemanticCompressor.compress("\n\n   \n")).toBe("No symbols detected.");
    
    const onlyComments = `
      // Comentario 1
      /* Comentario 2 */
      /** JSDoc */
    `;
    const compressed = SemanticCompressor.compress(onlyComments);
    // Ahora retorna "No symbols detected." para ahorrar tokens si no hay nada útil
    expect(compressed).toBe("No symbols detected.");
  });

  test("Normalización de Tokens: Modificadores Redundantes", () => {
    const raw = "export public async function test(public param: string): public string { }";
    const compressed = SemanticCompressor.compress(raw);
    
    // El compressor DEBE haber eliminado los 'public' redundantes de TS para ahorrar tokens
    expect(compressed).not.toContain("public");
    expect(compressed).toContain("E> export async function test(param: string): string");
  });
});
