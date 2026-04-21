import { expect, test, describe } from "bun:test";
import { SemanticCompressor } from "./compressor.js";

describe("SemanticCompressor Elite Suite", () => {
  
  test("Debería priorizar exportaciones sobre estructura interna", () => {
    const raw = `
      function internal() { return 1; }
      export class PublicAPI { }
      interface Contract { id: number }
    `;
    const compressed = SemanticCompressor.compress(raw);
    
    expect(compressed).toContain("E> export class PublicAPI");
    expect(compressed).toContain("S> function internal()");
    expect(compressed).toContain("S> interface Contract");
    // E> debe ir antes que S>
    expect(compressed.indexOf("E>")).toBeLessThan(compressed.indexOf("S>"));
  });

  test("Debería filtrar comentarios y ruido", () => {
    const raw = `
      // Esto es un comentario
      export const X = 1;
      /* Comentario multilínea
       * ruidoso */
    `;
    const compressed = SemanticCompressor.compress(raw);
    
    expect(compressed).toContain("E> export const X = 1;");
    expect(compressed).not.toContain("Esto es un comentario");
    expect(compressed).not.toContain("ruidoso");
  });

  test("Debería respetar el límite de caracteres", () => {
    const longString = "export const A = 1;\n".repeat(500);
    const compressed = SemanticCompressor.compress(longString, 1000); 
    
    expect(compressed.length).toBeLessThanOrEqual(1100);
    expect(compressed).toContain("[Note:");
  });
});
