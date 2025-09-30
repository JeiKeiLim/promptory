/**
 * YAML Parser 단위 테스트
 */

import { describe, it, expect } from 'vitest';
import { parsePromptFile, parseYamlHeader, separateYamlAndContent } from '@main/utils/yamlParser';
import type { PromptMetadata } from '@shared/types/prompt';

describe('yamlParser', () => {
  describe('separateYamlAndContent', () => {
    it('should separate YAML header and content correctly', () => {
      const content = `---
title: Test Prompt
description: A test prompt
tags:
  - test
  - example
favorite: false
created_at: "2024-01-01T00:00:00.000Z"
parameters: []
---

# Test Content

This is a test prompt.`;

      const result = separateYamlAndContent(content);

      expect(result.yamlHeader).toContain('title: Test Prompt');
      expect(result.content).toContain('# Test Content');
      expect(result.content).toContain('This is a test prompt.');
    });

    it('should throw error for content without YAML header', () => {
      const content = `# Simple Markdown

This is just markdown without YAML.`;

      expect(() => {
        separateYamlAndContent(content);
      }).toThrow('YAML header not found');
    });
  });

  describe('parseYamlHeader', () => {
    it('should parse valid YAML header', () => {
      const yamlHeader = `title: Test Prompt
description: A test prompt
tags:
  - test
  - example
favorite: false
created_at: "2024-01-01T00:00:00.000Z"
parameters: []`;

      const result = parseYamlHeader(yamlHeader);

      expect(result.title).toBe('Test Prompt');
      expect(result.description).toBe('A test prompt');
      expect(result.tags).toEqual(['test', 'example']);
      expect(result.favorite).toBe(false);
      expect(result.parameters).toEqual([]);
    });

    it('should parse parameters correctly', () => {
      const yamlHeader = `title: Parameterized Prompt
description: A prompt with parameters
tags: [test]
favorite: false
created_at: "2024-01-01T00:00:00.000Z"
parameters:
  - name: "language"
    type: "category"
    required: true
    description: "Programming language"
    options: ["Python", "JavaScript", "TypeScript"]
  - name: "code"
    type: "string"
    required: true
    description: "Code to review"`;

      const result = parseYamlHeader(yamlHeader);

      expect(result.parameters).toHaveLength(2);
      
      const langParam = result.parameters[0];
      expect(langParam.name).toBe('language');
      expect(langParam.type).toBe('category');
      expect(langParam.required).toBe(true);
      expect(langParam.options).toEqual(['Python', 'JavaScript', 'TypeScript']);

      const codeParam = result.parameters[1];
      expect(codeParam.name).toBe('code');
      expect(codeParam.type).toBe('string');
      expect(codeParam.required).toBe(true);
    });
  });

  describe('parsePromptFile', () => {
    it('should parse complete prompt file', () => {
      const content = `---
title: Test Prompt
description: A test prompt
tags:
  - test
favorite: false
created_at: "2024-01-01T00:00:00.000Z"
parameters: []
---

# Test Content

This is a test prompt.`;

      const result = parsePromptFile(content);

      expect(result.metadata.title).toBe('Test Prompt');
      expect(result.metadata.description).toBe('A test prompt');
      expect(result.metadata.tags).toEqual(['test']);
      expect(result.content).toContain('# Test Content');
      expect(result.rawContent).toBe(content);
    });

    it('should throw error for invalid YAML', () => {
      const content = `---
title: Test Prompt
invalid_yaml: [unclosed array
---

Content here`;

      expect(() => {
        parsePromptFile(content);
      }).toThrow();
    });
  });
});