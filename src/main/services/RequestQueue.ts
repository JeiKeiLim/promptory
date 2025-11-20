/**
 * Request Queue
 * 
 * Sequential FIFO queue for LLM API calls
 * Processes one request at a time to avoid rate limiting
 */

import { LLMRequest } from '@shared/types/llm';

export class RequestQueue {
  private queue: LLMRequest[] = [];

  /**
   * Add request to the end of the queue
   */
  enqueue(request: LLMRequest): void {
    this.queue.push(request);
  }

  /**
   * Remove and return the first request in the queue
   */
  dequeue(): LLMRequest | null {
    const request = this.queue.shift();
    return request || null;
  }

  /**
   * View the first request without removing it
   */
  peek(): LLMRequest | null {
    return this.queue[0] || null;
  }

  /**
   * Remove a specific request by ID
   */
  remove(requestId: string): boolean {
    const index = this.queue.findIndex(req => req.id === requestId);
    if (index === -1) return false;

    this.queue.splice(index, 1);
    return true;
  }

  /**
   * Clear all requests from the queue
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Get the number of requests in the queue
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if the queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Get all requests as an array (does not modify queue)
   */
  toArray(): LLMRequest[] {
    return [...this.queue];
  }

  /**
   * Check if a request with the given ID exists in the queue
   */
  has(requestId: string): boolean {
    return this.queue.some(req => req.id === requestId);
  }
}

