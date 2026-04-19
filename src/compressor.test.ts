import { expect, test, describe } from "bun:test";
import { SemanticCompressor } from "./compressor.js";

describe("SemanticCompressor Elite Suite", () => {
  
  test("Debería priorizar exportaciones sobre implementación", () => {
    const raw = `
      function internal() { return 1; }
      export class PublicAPI { }
      interface Contract { id: number }
    `;
    const compressed = SemanticCompressor.compress(raw);
    
    expect(compressed).toContain("PublicAPI");
    expect(compressed).toContain("Contract");
    expect(compressed.indexOf("PublicAPI")).toBeLessThan(compressed.indexOf("internal"));
  });

  test("Debería filtrar comentarios y ruido", () => {
    const raw = `
      // Esto es un comentario
      export const X = 1;
      /* Comentario multilínea
       * ruidoso */
    `;
    const compressed = SemanticCompressor.compress(raw);
    
    expect(compressed).toContain("export const X = 1;");
    expect(compressed).not.toContain("Esto es un comentario");
    expect(compressed).not.toContain("ruidoso");
  });

  test("Debería respetar el límite de caracteres", () => {
    const longString = "export const A = 1;\n".repeat(500);
    const compressed = SemanticCompressor.compress(longString);
    
    expect(compressed.length).toBeLessThanOrEqual(2600); // 2500 + margen de headers
    expect(compressed).toContain("[Note: Some minor details were omitted for brevity]");
  });
});
