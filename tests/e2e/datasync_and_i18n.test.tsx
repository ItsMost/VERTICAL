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
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /^EN$/ })[0]);
    });
    expect(document.documentElement.dir).toBe('ltr');
    expect(screen.getAllByText(translations.en.s.navAthletes).length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /عربي/ })[0]);
    });
    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getAllByText(translations.ar.s.navAthletes).length).toBeGreaterThan(0);
  });

  test('verifies Sprint and VBT menus are completely removed as requested', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.queryByText(/تحليل السرعة/i)).toBeNull();
    expect(screen.queryByText(/كاميرا VBT/i)).toBeNull();
    expect(screen.queryByText(/Sprint Analyzer/i)).toBeNull();
    expect(screen.queryByText(/VBT Camera/i)).toBeNull();
  });
});
