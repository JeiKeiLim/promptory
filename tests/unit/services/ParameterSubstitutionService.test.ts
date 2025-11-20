/**
 * Unit Tests for ParameterSubstitutionService (TDD)
 * 
 * Tests parameter replacement in prompt templates
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ParameterSubstitutionService } from '@main/services/ParameterSubstitutionService';

describe('ParameterSubstitutionService', () => {
  let service: ParameterSubstitutionService;

  beforeEach(() => {
    service = new ParameterSubstitutionService();
  });

  describe('parameter extraction', () => {
    it('should extract single parameter', () => {
      const template = 'Hello {{name}}!';
      const params = service.extractParameterNames(template);
      expect(params).toEqual(['name']);
    });

    it('should extract multiple parameters', () => {
      const template = 'Hello {{name}}, your age is {{age}} and you live in {{city}}.';
      const params = service.extractParameterNames(template);
      expect(params).toEqual(['name', 'age', 'city']);
    });

    it('should handle duplicate parameters (return unique list)', () => {
      const template = '{{name}} said hello to {{name}} again.';
      const params = service.extractParameterNames(template);
      expect(params).toEqual(['name']);
    });

    it('should return empty array for template without parameters', () => {
      const template = 'This is a static prompt.';
      const params = service.extractParameterNames(template);
      expect(params).toEqual([]);
    });

    it('should handle parameters with underscores and numbers', () => {
      const template = '{{param_1}} and {{param_2}} and {{user_name}}';
      const params = service.extractParameterNames(template);
      expect(params).toEqual(['param_1', 'param_2', 'user_name']);
    });

    it('should ignore malformed parameters', () => {
      const template = 'Valid {{name}}, invalid { name }, {{another}}';
      const params = service.extractParameterNames(template);
      expect(params).toEqual(['name', 'another']);
    });

    it('should handle multiline templates', () => {
      const template = `
        # Title
        Hello {{name}},
        
        Your topic is: {{topic}}
        Your context is: {{context}}
      `;
      const params = service.extractParameterNames(template);
      expect(params).toEqual(['name', 'topic', 'context']);
    });
  });

  describe('parameter substitution', () => {
    it('should substitute single parameter', () => {
      const template = 'Hello {{name}}!';
      const result = service.substitute(template, { name: 'Alice' });
      expect(result).toBe('Hello Alice!');
    });

    it('should substitute multiple parameters', () => {
      const template = 'Hello {{name}}, you are {{age}} years old.';
      const result = service.substitute(template, { name: 'Bob', age: '25' });
      expect(result).toBe('Hello Bob, you are 25 years old.');
    });

    it('should handle duplicate parameters', () => {
      const template = '{{name}} said hello to {{name}}.';
      const result = service.substitute(template, { name: 'Charlie' });
      expect(result).toBe('Charlie said hello to Charlie.');
    });

    it('should leave unmatched parameters unchanged', () => {
      const template = 'Hello {{name}}, your {{missing}} is here.';
      const result = service.substitute(template, { name: 'Dave' });
      expect(result).toBe('Hello Dave, your {{missing}} is here.');
    });

    it('should handle empty parameter values', () => {
      const template = 'Hello {{name}}!';
      const result = service.substitute(template, { name: '' });
      expect(result).toBe('Hello !');
    });

    it('should handle parameters with special characters', () => {
      const template = 'Code: {{code}}';
      const result = service.substitute(template, { 
        code: 'const x = { y: "test" };' 
      });
      expect(result).toBe('Code: const x = { y: "test" };');
    });

    it('should handle multiline parameter values', () => {
      const template = 'Content:\n{{content}}';
      const result = service.substitute(template, { 
        content: 'Line 1\nLine 2\nLine 3' 
      });
      expect(result).toBe('Content:\nLine 1\nLine 2\nLine 3');
    });

    it('should handle unicode in parameters', () => {
      const template = 'Hello {{name}}!';
      const result = service.substitute(template, { name: '世界' });
      expect(result).toBe('Hello 世界!');
    });

    it('should preserve whitespace', () => {
      const template = 'Hello {{name}}    !';
      const result = service.substitute(template, { name: 'Alice' });
      expect(result).toBe('Hello Alice    !');
    });

    it('should handle complex markdown template', () => {
      const template = `
# {{title}}

## Introduction
Hello {{name}},

## Topic
You asked about: {{topic}}

## Context
{{context}}

## Conclusion
Best regards,
{{signature}}
      `;
      
      const result = service.substitute(template, {
        title: 'AI Report',
        name: 'Alice',
        topic: 'Machine Learning',
        context: 'Deep learning applications',
        signature: 'Your AI Assistant'
      });

      expect(result).toContain('# AI Report');
      expect(result).toContain('Hello Alice,');
      expect(result).toContain('You asked about: Machine Learning');
      expect(result).toContain('Deep learning applications');
      expect(result).toContain('Your AI Assistant');
    });
  });

  describe('parameter validation', () => {
    it('should validate all required parameters are present', () => {
      const template = 'Hello {{name}}, age {{age}}';
      const result = service.validateParameters(
        template,
        { name: 'Alice', age: '25' },
        ['name', 'age']
      );
      
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should detect missing required parameters', () => {
      const template = 'Hello {{name}}, age {{age}}';
      const result = service.validateParameters(
        template,
        { name: 'Alice' },
        ['name', 'age']
      );
      
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['age']);
    });

    it('should detect multiple missing parameters', () => {
      const template = 'Hello {{name}}, age {{age}}, city {{city}}';
      const result = service.validateParameters(
        template,
        { name: 'Alice' },
        ['name', 'age', 'city']
      );
      
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['age', 'city']);
    });

    it('should allow extra parameters (not required)', () => {
      const template = 'Hello {{name}}';
      const result = service.validateParameters(
        template,
        { name: 'Alice', extra: 'value' },
        ['name']
      );
      
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should reject empty string for required parameter', () => {
      const template = 'Hello {{name}}';
      const result = service.validateParameters(
        template,
        { name: '' },
        ['name']
      );
      
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['name']);
    });

    it('should handle template with no parameters', () => {
      const template = 'Static prompt';
      const result = service.validateParameters(
        template,
        {},
        []
      );
      
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty template', () => {
      const result = service.substitute('', { name: 'Alice' });
      expect(result).toBe('');
    });

    it('should handle empty parameters object', () => {
      const template = 'Hello {{name}}';
      const result = service.substitute(template, {});
      expect(result).toBe('Hello {{name}}');
    });

    it('should handle nested braces', () => {
      const template = 'JSON: { "name": "{{name}}" }';
      const result = service.substitute(template, { name: 'Alice' });
      expect(result).toBe('JSON: { "name": "Alice" }');
    });

    it('should handle parameters adjacent to each other', () => {
      const template = '{{param1}}{{param2}}';
      const result = service.substitute(template, { param1: 'A', param2: 'B' });
      expect(result).toBe('AB');
    });

    it('should handle very long parameter values', () => {
      const longValue = 'A'.repeat(10000);
      const template = 'Content: {{text}}';
      const result = service.substitute(template, { text: longValue });
      expect(result).toContain(longValue);
      expect(result.length).toBe('Content: '.length + longValue.length);
    });

    it('should not substitute similar but different patterns', () => {
      const template = 'Valid: {{name}}, Invalid: {name}, {{NAME}}';
      const result = service.substitute(template, { name: 'Alice' });
      expect(result).toBe('Valid: Alice, Invalid: {name}, {{NAME}}');
    });
  });
});

