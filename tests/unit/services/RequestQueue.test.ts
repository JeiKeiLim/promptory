/**
 * Unit Tests for RequestQueue (TDD)
 * 
 * Tests sequential FIFO queue for LLM API calls
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LLMRequest } from '@shared/types/llm';
import { RequestQueue } from '@main/services/RequestQueue';

describe('RequestQueue', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue();
  });

  describe('basic operations', () => {
    it('should start empty', () => {
      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });

    it('should enqueue a request', () => {
      const request: LLMRequest = {
        id: 'req-1',
        promptId: 'prompt-1',
        promptContent: 'Test prompt',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: Date.now()
      };

      queue.enqueue(request);
      expect(queue.isEmpty()).toBe(false);
      expect(queue.size()).toBe(1);
    });

    it('should dequeue in FIFO order', () => {
      const req1: LLMRequest = {
        id: 'req-1',
        promptId: 'prompt-1',
        promptContent: 'First',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: 1000
      };

      const req2: LLMRequest = {
        id: 'req-2',
        promptId: 'prompt-2',
        promptContent: 'Second',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: 2000
      };

      queue.enqueue(req1);
      queue.enqueue(req2);

      const first = queue.dequeue();
      expect(first?.id).toBe('req-1');

      const second = queue.dequeue();
      expect(second?.id).toBe('req-2');

      expect(queue.isEmpty()).toBe(true);
    });

    it('should return null when dequeueing from empty queue', () => {
      const result = queue.dequeue();
      expect(result).toBeNull();
    });
  });

  describe('peek operation', () => {
    it('should return next item without removing it', () => {
      const request: LLMRequest = {
        id: 'req-1',
        promptId: 'prompt-1',
        promptContent: 'Test',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: Date.now()
      };

      queue.enqueue(request);

      const peeked = queue.peek();
      expect(peeked?.id).toBe('req-1');
      expect(queue.size()).toBe(1); // Still in queue
    });

    it('should return null when peeking empty queue', () => {
      const peeked = queue.peek();
      expect(peeked).toBeNull();
    });
  });

  describe('remove operation', () => {
    it('should remove specific request by ID', () => {
      const req1: LLMRequest = {
        id: 'req-1',
        promptId: 'prompt-1',
        promptContent: 'First',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: Date.now()
      };

      const req2: LLMRequest = {
        id: 'req-2',
        promptId: 'prompt-2',
        promptContent: 'Second',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: Date.now()
      };

      queue.enqueue(req1);
      queue.enqueue(req2);

      const removed = queue.remove('req-1');
      expect(removed).toBe(true);
      expect(queue.size()).toBe(1);

      const remaining = queue.peek();
      expect(remaining?.id).toBe('req-2');
    });

    it('should return false when removing non-existent request', () => {
      const removed = queue.remove('non-existent');
      expect(removed).toBe(false);
    });

    it('should maintain order after removing middle item', () => {
      const req1: LLMRequest = {
        id: 'req-1',
        promptId: 'p1',
        promptContent: 'First',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: 1000
      };

      const req2: LLMRequest = {
        id: 'req-2',
        promptId: 'p2',
        promptContent: 'Second',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: 2000
      };

      const req3: LLMRequest = {
        id: 'req-3',
        promptId: 'p3',
        promptContent: 'Third',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: 3000
      };

      queue.enqueue(req1);
      queue.enqueue(req2);
      queue.enqueue(req3);

      queue.remove('req-2');

      expect(queue.dequeue()?.id).toBe('req-1');
      expect(queue.dequeue()?.id).toBe('req-3');
    });
  });

  describe('clear operation', () => {
    it('should remove all requests', () => {
      const req1: LLMRequest = {
        id: 'req-1',
        promptId: 'p1',
        promptContent: 'First',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: Date.now()
      };

      const req2: LLMRequest = {
        id: 'req-2',
        promptId: 'p2',
        promptContent: 'Second',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: Date.now()
      };

      queue.enqueue(req1);
      queue.enqueue(req2);

      queue.clear();

      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });
  });

  describe('has operation', () => {
    it('should check if request exists', () => {
      const request: LLMRequest = {
        id: 'req-1',
        promptId: 'p1',
        promptContent: 'Test',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: Date.now()
      };

      queue.enqueue(request);

      expect(queue.has('req-1')).toBe(true);
      expect(queue.has('non-existent')).toBe(false);
    });
  });

  describe('toArray operation', () => {
    it('should return all requests as array', () => {
      const req1: LLMRequest = {
        id: 'req-1',
        promptId: 'p1',
        promptContent: 'First',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: Date.now()
      };

      const req2: LLMRequest = {
        id: 'req-2',
        promptId: 'p2',
        promptContent: 'Second',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: Date.now()
      };

      queue.enqueue(req1);
      queue.enqueue(req2);

      const array = queue.toArray();
      expect(array).toHaveLength(2);
      expect(array[0].id).toBe('req-1');
      expect(array[1].id).toBe('req-2');
    });

    it('should return empty array for empty queue', () => {
      const array = queue.toArray();
      expect(array).toEqual([]);
    });

    it('should not affect queue when returning array', () => {
      const request: LLMRequest = {
        id: 'req-1',
        promptId: 'p1',
        promptContent: 'Test',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: Date.now()
      };

      queue.enqueue(request);
      const array = queue.toArray();

      expect(queue.size()).toBe(1);
      expect(array.length).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle duplicate IDs gracefully', () => {
      const req1: LLMRequest = {
        id: 'req-1',
        promptId: 'p1',
        promptContent: 'First',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: Date.now()
      };

      const req2: LLMRequest = {
        id: 'req-1',
        promptId: 'p2',
        promptContent: 'Second',
        parameters: {},
        provider: 'ollama',
        model: 'gemma3',
        status: 'pending',
        createdAt: Date.now()
      };

      queue.enqueue(req1);
      queue.enqueue(req2);

      // Should have both (queue doesn't enforce uniqueness)
      expect(queue.size()).toBe(2);
    });

    it('should handle many requests', () => {
      const requests: LLMRequest[] = [];
      for (let i = 0; i < 100; i++) {
        requests.push({
          id: `req-${i}`,
          promptId: `p-${i}`,
          promptContent: `Content ${i}`,
          parameters: {},
          provider: 'ollama',
          model: 'gemma3',
          status: 'pending',
          createdAt: Date.now() + i
        });
      }

      requests.forEach(req => queue.enqueue(req));

      expect(queue.size()).toBe(100);

      for (let i = 0; i < 100; i++) {
        const dequeued = queue.dequeue();
        expect(dequeued?.id).toBe(`req-${i}`);
      }

      expect(queue.isEmpty()).toBe(true);
    });
  });
});

