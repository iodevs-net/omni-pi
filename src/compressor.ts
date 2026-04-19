export function compressSerenaResponse(response: any): string {
  if (!response || !response.content || response.content.length === 0) {
    return "No semantic context found.";
  }

  const data = JSON.parse(response.content[0].text);
  
  // Basic compression logic
  let output = "SEMANTIC_CONTEXT {\n";
  
  if (data.dependents && data.dependents.length > 0) {
    output += `  dependents: [${data.dependents.join(", ")}]\n`;
  }
  
  if (data.returnType) {
    output += `  returnType: ${data.returnType}\n`;
  }
  
  if (data.breakingChange) {
    output += `  breakingChange: YES\n`;
  }

  output += "}";
  return output;
}
