import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import App from '../../src/App';
import { translations } from '../../src/translations';

describe('App Sanity Test', () => {
  test('renders the shell with the four main tabs', async () => {
    await act(async () => {
      render(<App />);
    });
    const ar = translations.ar.s;
    for (const label of [ar.navAthletes, ar.navTest, ar.navRankings, ar.navProfile]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    // FV-profile / force-time tab is gone
    expect(screen.queryByText(/FVP/)).toBeNull();
  });
});
