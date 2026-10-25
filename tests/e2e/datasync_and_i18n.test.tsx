import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import App from '../../src/App';
import { translations } from '../../src/translations';

describe('Bilingual & State Sync Verification', () => {
  test('switches language between English and Arabic seamlessly', async () => {
    await act(async () => {
      render(<App />);
    });

    // Language toggle buttons EN and عربي
    const enButtons = screen.getAllByRole('button', { name: /EN/i });
    expect(enButtons.length).toBeGreaterThan(0);

    // Switch to English
    await act(async () => {
      fireEvent.click(enButtons[0]);
    });

    // Check English translations rendered
    expect(screen.getByText(translations.en.hud.addCoach)).toBeInTheDocument();
    expect(screen.getAllByText(translations.en.nav.roster).length).toBeGreaterThan(0);

    // Switch back to Arabic
    const arButtons = screen.getAllByRole('button', { name: /عربي/i });
    await act(async () => {
      fireEvent.click(arButtons[0]);
    });

    // Check Arabic translations rendered
    expect(screen.getByText(translations.ar.hud.addCoach)).toBeInTheDocument();
  });

  test('verifies Sprint and VBT menus are completely removed as requested', async () => {
    await act(async () => {
      render(<App />);
    });

    // SprintAnalyzer and VBTCamera should NOT exist in navigation
    expect(screen.queryByText(/تحليل السرعة/i)).toBeNull();
    expect(screen.queryByText(/كاميرا VBT/i)).toBeNull();
    expect(screen.queryByText(/Sprint Analyzer/i)).toBeNull();
    expect(screen.queryByText(/VBT Camera/i)).toBeNull();
  });
});
