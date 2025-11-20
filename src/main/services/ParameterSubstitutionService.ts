/**
 * Parameter Substitution Service
 * 
 * Handles parameter replacement in prompt templates
 * Format: {{parameter_name}}
 */

export class ParameterSubstitutionService {
  /**
   * Extract all parameter names from a template
   */
  extractParameterNames(template: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const matches: string[] = [];
    const seen = new Set<string>();
    
    let match;
    while ((match = regex.exec(template)) !== null) {
      const paramName = match[1];
      if (!seen.has(paramName)) {
        matches.push(paramName);
        seen.add(paramName);
      }
    }
    
    return matches;
  }

  /**
   * Substitute parameters in a template
   */
  substitute(template: string, parameters: Record<string, string>): string {
    if (!template) return '';
    
    let result = template;
    
    // Replace each parameter
    for (const [key, value] of Object.entries(parameters)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }

  /**
   * Validate that all required parameters are provided and non-empty
   */
  validateParameters(
    template: string,
    parameters: Record<string, string>,
    requiredParams: string[]
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    for (const param of requiredParams) {
      const value = parameters[param];
      if (value === undefined || value === null || value.trim() === '') {
        missing.push(param);
      }
    }
    
    return {
      valid: missing.length === 0,
      missing
    };
  }
}

