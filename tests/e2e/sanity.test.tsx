import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { expect, test, describe, beforeAll, afterAll, vi } from 'vitest';
import App from '../../src/App';

describe('App Sanity Test', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('renders loading screen and then transitions to the dashboard without crashing', async () => {
    render(<App />);

    // Check that the loading screen is displayed
    expect(screen.getByText(/The Lab/i)).toBeInTheDocument();
    expect(screen.getByText(/جاري تهيئة مختبر الأداء/i)).toBeInTheDocument();

    // Fast-forward timers to complete the 100% loading simulation and flush subsequent state transitions
    await act(async () => {
      vi.advanceTimersByTime(3000);
      vi.runAllTimers();
    });

    // Assert that the dashboard has loaded (JumpCalculator renders a logout button with "خروج")
    expect(screen.getByRole('button', { name: /خروج/i })).toBeInTheDocument();

    // Verify loading screen is gone
    expect(screen.queryByText(/جاري تهيئة مختبر الأداء/i)).not.toBeInTheDocument();
  });
});
