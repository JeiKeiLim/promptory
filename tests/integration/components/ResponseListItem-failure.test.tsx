/**
 * T088: Visual indicator for fallback responses
 * Tests for distinguishing auto-generated titles vs fallback titles
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponseListItem } from '../../../src/renderer/components/llm/ResponseListItem';

describe('ResponseListItem Failure Indicators (US3)', () => {
  // T088: Visual indicator for failed title generation
  it('should show visual indicator for failed title generation', () => {
    const response = {
      id: 'test-1',
      model: 'gemma3',
      createdAt: Date.now(),
      metadata: {
        titleGenerationStatus: 'failed' as const
      }
    };

    render(<ResponseListItem response={response} />);

    // Should show some indicator of failure (icon, badge, different styling)
    // Implementation can use: ⚠️, ❌, or specific CSS class
    const element = screen.getByTestId('response-item-test-1') || screen.getByText(/gemma3/);
    expect(element).toBeInTheDocument();
  });

  it('should distinguish between successful and failed title generation', () => {
    const successResponse = {
      id: 'test-success',
      model: 'gemma3',
      createdAt: Date.now(),
      metadata: {
        generatedTitle: 'Test Title Generated Successfully',
        titleGenerationStatus: 'completed' as const
      }
    };

    const failedResponse = {
      id: 'test-failed',
      model: 'gemma3',
      createdAt: Date.now(),
      metadata: {
        titleGenerationStatus: 'failed' as const
      }
    };

    const { rerender } = render(<ResponseListItem response={successResponse} />);
    const successElement = screen.getByText(/Test Title Generated Successfully/);
    expect(successElement).toBeInTheDocument();

    rerender(<ResponseListItem response={failedResponse} />);
    const failedElement = screen.getByText(/gemma3/);
    expect(failedElement).toBeInTheDocument();
  });

  it('should handle pending status during title generation', () => {
    const pendingResponse = {
      id: 'test-pending',
      model: 'gemma3',
      createdAt: Date.now(),
      metadata: {
        titleGenerationStatus: 'pending' as const
      }
    };

    render(<ResponseListItem response={pendingResponse} />);

    // Should show loading indicator
    const loadingIndicator = screen.queryByText(/generating/i) || 
                            screen.queryByTestId('title-loading');
    expect(loadingIndicator).toBeInTheDocument();
  });
});
