import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import App from '../../src/App';

describe('App Sanity Test', () => {
  test('renders Vertical Lab telemetry dashboard and navigation without crashing', async () => {
    await act(async () => {
      render(<App />);
    });

    // Check that the telemetry brand header is displayed
    expect(screen.getByText(/Vertical Lab/i)).toBeInTheDocument();
    expect(screen.getByText(/v2.0/i)).toBeInTheDocument();

    // Check that primary telemetry navigation modules are rendered
    expect(screen.getAllByText(/اللاعبين|لوحة اللاعبين|Roster/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/الوثب|الوثب الرأسي|Jump/i).length).toBeGreaterThan(0);
  });
});

