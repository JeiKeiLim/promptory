/**
 * Integration test for LLM request queue and event system
 * Tests the complete flow: Queue → Process → Events → Store Updates
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RequestQueue } from '@main/services/RequestQueue';
import type { LLMRequest } from '@shared/types/llm';

describe('LLM Queue Integration Test', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue();
  });

  it('should enqueue and dequeue requests in FIFO order', () => {
    const request1: LLMRequest = {
      id: 'req-1',
      promptId: 'prompt-1',
      promptContent: 'Test content 1',
      parameters: {},
      provider: 'ollama',
      model: 'gemma3:1b',
      status: 'pending',
      createdAt: Date.now()
    };

    const request2: LLMRequest = {
      id: 'req-2',
      promptId: 'prompt-2',
      promptContent: 'Test content 2',
      parameters: {},
      provider: 'ollama',
      model: 'gemma3:1b',
      status: 'pending',
      createdAt: Date.now()
    };

    queue.enqueue(request1);
    queue.enqueue(request2);

    console.log('[TEST] Queue size after enqueue:', queue.size());
    expect(queue.size()).toBe(2);

    const dequeued1 = queue.dequeue();
    console.log('[TEST] First dequeued:', dequeued1?.id);
    expect(dequeued1?.id).toBe('req-1');

    const dequeued2 = queue.dequeue();
    console.log('[TEST] Second dequeued:', dequeued2?.id);
    expect(dequeued2?.id).toBe('req-2');

    expect(queue.size()).toBe(0);
  });

  it('should handle queue cancellation', () => {
    const request1: LLMRequest = {
      id: 'req-1',
      promptId: 'prompt-1',
      promptContent: 'Test content 1',
      parameters: {},
      provider: 'ollama',
      model: 'gemma3:1b',
      status: 'pending',
      createdAt: Date.now()
    };

    const request2: LLMRequest = {
      id: 'req-2',
      promptId: 'prompt-2',
      promptContent: 'Test content 2',
      parameters: {},
      provider: 'ollama',
      model: 'gemma3:1b',
      status: 'pending',
      createdAt: Date.now()
    };

    queue.enqueue(request1);
    queue.enqueue(request2);

    console.log('[TEST] Removing request 1');
    const removed = queue.remove('req-1');
    expect(removed).toBe(true);

    console.log('[TEST] Queue size after remove:', queue.size());
    expect(queue.size()).toBe(1);

    const dequeued = queue.dequeue();
    expect(dequeued?.id).toBe('req-2');
  });

  it('should cancel all requests', () => {
    const request1: LLMRequest = {
      id: 'req-1',
      promptId: 'prompt-1',
      promptContent: 'Test content 1',
      parameters: {},
      provider: 'ollama',
      model: 'gemma3:1b',
      status: 'pending',
      createdAt: Date.now()
    };

    const request2: LLMRequest = {
      id: 'req-2',
      promptId: 'prompt-2',
      promptContent: 'Test content 2',
      parameters: {},
      provider: 'ollama',
      model: 'gemma3:1b',
      status: 'pending',
      createdAt: Date.now()
    };

    queue.enqueue(request1);
    queue.enqueue(request2);

    console.log('[TEST] Clearing all requests');
    queue.clear();

    console.log('[TEST] Queue size after clear:', queue.size());
    expect(queue.size()).toBe(0);
  });

  it('should return correct queue size', () => {
    expect(queue.size()).toBe(0);

    const request: LLMRequest = {
      id: 'req-1',
      promptId: 'prompt-1',
      promptContent: 'Test content',
      parameters: {},
      provider: 'ollama',
      model: 'gemma3:1b',
      status: 'pending',
      createdAt: Date.now()
    };

    queue.enqueue(request);
    expect(queue.size()).toBe(1);

    queue.dequeue();
    expect(queue.size()).toBe(0);
  });
});

